import { useCallback, useEffect, useState } from "react";
import { createQuestChat, type CreateQuestChatMessage } from "../server/LLM";

export const useCreateQuestChat = () => {
  const [messages, setMessages] = useState<CreateQuestChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [waitingForLLM, setWaitingForLLM] = useState(false);
  const [clarity, setClarity] = useState(0);
  const postUserMessage = useCallback((content: string) => {
    const newMessage: CreateQuestChatMessage = {
      role: "user",
      content,
    };
    setMessages((m) => [...m, newMessage]);
    setWaitingForLLM(true);
  }, []);
  useEffect(() => {
    if (!waitingForLLM) return;
    setWaitingForLLM(false);
    setThinking(true);
    (async () => {
      const prevMessages = messages;
      let newMessageText = "";
      try {
        for await (const event of await createQuestChat(messages)) {
          switch (event.type) {
            case "reasoning-part": {
              setThinkingMessage(event.title);
              break;
            }
            case "text-delta": {
              newMessageText += event.text;
              setMessages([
                ...prevMessages,
                { role: "assistant", content: newMessageText },
              ]);
              break;
            }
            case "set-clarity": {
              setClarity(event.level);
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
    clarity,
    postUserMessage,
  ] as const;
};
