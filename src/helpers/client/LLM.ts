import { useCallback, useEffect, useState } from "react";
import {
  createQuestChat,
  type CreateQuestChatMessage,
  type ConfidenceLevel,
  getQuestTitleAndDescription,
  type GeneratedTitleAndDescription,
} from "../server/LLM";

export type OptionsMessage = { role: "options"; options: string[] };

export const isOptionsMessage = (message: unknown): message is OptionsMessage =>
  typeof message === "object" &&
  message !== null &&
  "role" in message &&
  message.role === "options" &&
  "options" in message &&
  Array.isArray(message.options);

export const useCreateQuestChat = () => {
  const [messages, setMessages] = useState<
    (CreateQuestChatMessage | OptionsMessage)[]
  >([]);
  const [thinking, setThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [waitingForLLM, setWaitingForLLM] = useState(false);
  const [confidence, setConfidence] = useState<ConfidenceLevel>("ZERO");
  const postUserMessage = useCallback(
    (content: string) => {
      if (waitingForLLM || thinking) return;
      const newMessage: CreateQuestChatMessage = { role: "user", content };
      setThinking(true);
      setMessages((m) => [...m, newMessage]);
      // setTimeout(() => {
      //   setMessages((m) => [...m, { ...newMessage, role: "assistant" }]);
      //   setThinking(false);
      // }, 1000);
      setWaitingForLLM(true);
    },
    [thinking, waitingForLLM],
  );
  useEffect(() => {
    if (!waitingForLLM) return;
    setWaitingForLLM(false);
    (async () => {
      const prevMessages = messages;
      let newMessages: typeof messages = [];
      let textDelta = "";
      try {
        for await (const event of await createQuestChat(
          messages.filter((m) => m.role !== "options"),
        )) {
          switch (event.type) {
            case "reasoning-part": {
              setThinkingMessage(event.title);
              break;
            }
            case "text-delta": {
              textDelta += event.text;
              setMessages([
                ...prevMessages,
                ...newMessages,
                { role: "assistant", content: textDelta },
              ]);
              break;
            }
            case "option-delta": {
              const textDeltaMessage: CreateQuestChatMessage[] =
                /^[\s\n]*$/.test(textDelta)
                  ? []
                  : [{ role: "assistant", content: textDelta }];
              const latestNewMessage = newMessages[newMessages.length - 1];
              if (isOptionsMessage(latestNewMessage)) {
                latestNewMessage.options = [
                  ...latestNewMessage.options,
                  event.text,
                ];
              } else {
                newMessages = [
                  ...newMessages,
                  ...textDeltaMessage,
                  { role: "options", options: [event.text] } as OptionsMessage,
                ];
              }
              textDelta = "";
              setMessages([...prevMessages, ...newMessages]);
              break;
            }
            case "set-confidence": {
              setConfidence(event.level);
              break;
            }
          }
        }
      } finally {
        setThinking(false);
        setThinkingMessage("");
      }
    })();
  }, [messages, waitingForLLM]);
  return [
    messages,
    thinking,
    thinkingMessage,
    confidence,
    postUserMessage,
  ] as const;
};

export const useGenerateDescriptionTitle = () => {
  const [conversation, setConversationInternal] = useState("");
  const [thinking, setThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [descriptionTitle, setDescriptionTitle] =
    useState<GeneratedTitleAndDescription>({
      description: "",
      contributorTitle: "",
      seekerTitle: "",
    });
  const [waitingForLLM, setWaitingForLLM] = useState(false);
  const setConversation = useCallback(
    (newConversation: string) => {
      if (waitingForLLM || thinking || conversation === newConversation) return;
      setThinking(true);
      setConversationInternal(newConversation);
      setWaitingForLLM(true);
    },
    [conversation, thinking, waitingForLLM],
  );
  useEffect(() => {
    if (!waitingForLLM || !conversation) return;
    console.log({ h: "useGenerateDescriptionTitle", conversation });
    setWaitingForLLM(false);
    (async () => {
      let descriptionTitle: GeneratedTitleAndDescription = {
        description: "",
        contributorTitle: "",
        seekerTitle: "",
      };
      try {
        for await (const event of await getQuestTitleAndDescription(
          conversation,
        )) {
          switch (event.type) {
            case "reasoning-part": {
              setThinkingMessage(event.title);
              break;
            }
            case "generated-title-and-description": {
              descriptionTitle = event.value;
              break;
            }
          }
        }
      } finally {
        setThinking(false);
        setThinkingMessage("");
        setDescriptionTitle({ ...descriptionTitle });
      }
    })();
  }, [conversation, waitingForLLM]);
  return [
    descriptionTitle,
    thinking,
    thinkingMessage,
    setConversation,
  ] as const;
};
