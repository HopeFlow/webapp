import { useCallback, useEffect, useRef, useState } from "react";
import {
  createQuestChat,
  type CreateQuestChatMessage,
  type ConfidenceLevel,
  getQuestTitleAndDescription,
  type GeneratedTitleAndDescription,
  type ReasoningEvent,
  QuestIntentState,
} from "../server/LLM";

export type OptionsMessage = {
  role: "options";
  options: string[];
  confirmation?: boolean;
};

export const isOptionsMessage = (message: unknown): message is OptionsMessage =>
  typeof message === "object" &&
  message !== null &&
  "role" in message &&
  message.role === "options" &&
  "options" in message &&
  Array.isArray(message.options);

type StreamingChatBaseEvent = ReasoningEvent | { type: string };
type HandlerEvent<S> = S extends () => AsyncGenerator<infer E, void, unknown>
  ? Exclude<E, ReasoningEvent>
  : never;

function useStreamingChat<E extends StreamingChatBaseEvent, S extends object>(
  start: () => AsyncGenerator<E, void, unknown>,
  handler: (
    state: Partial<S>,
    event: Exclude<E, ReasoningEvent>,
  ) => S | undefined | Promise<S | undefined>,
) {
  const [thinking, setThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (thinking) return;
    let canceled = false;
    setThinking(true);
    setError(null);
    try {
      let state = {} as Partial<S>;
      for await (const event of await start()) {
        if (canceled) break;
        if (event.type === "reasoning-part") {
          if ((event as ReasoningEvent).title)
            setThinkingMessage((event as ReasoningEvent).title);
        } else {
          const result = await handler(
            state,
            event as Exclude<E, ReasoningEvent>,
          );
          if (result === undefined) break;
          state = result;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setThinking(false);
      setThinkingMessage("");
    }
    return () => ({
      cancel() {
        canceled = true;
      },
    });
  }, [thinking, start, handler]);

  return { thinking, thinkingMessage, error, run };
}

export const useCreateQuestChat = () => {
  const [messages, setMessages] = useState<
    (CreateQuestChatMessage | OptionsMessage)[]
  >([]);
  const [confidence, setConfidence] = useState<ConfidenceLevel>("ZERO");
  const [questIntentState, setQuestIntentState] =
    useState<QuestIntentState | null>(null);
  const messagesSnapshotRef = useRef<typeof messages>([]);
  const userMessageRef = useRef<string>("");
  const questIntentStateSnapshotRef =
    useRef<typeof questIntentState>(questIntentState);
  const start = useCallback(
    () =>
      createQuestChat(
        questIntentStateSnapshotRef.current,
        userMessageRef.current,
      ),
    [],
  );
  const handler = useCallback(
    (
      state: { newMessages?: typeof messages; textDelta?: string },
      event: HandlerEvent<typeof start>,
    ) => {
      const newMessages = state.newMessages ?? [];
      const textDelta = state.textDelta ?? "";
      switch (event.type) {
        case "text-delta": {
          setMessages([
            ...messagesSnapshotRef.current,
            ...newMessages,
            { role: "assistant", content: textDelta + event.text },
          ]);
          return { newMessages, textDelta: textDelta + event.text };
        }
        case "update-quest-intent-state": {
          console.log("Updating quest intent state", event.questIntentState);
          setQuestIntentState(event.questIntentState);
          return state;
        }
        case "option-delta": {
          console.log("Option delta event:", event);
          const updatedNewMessages = (() => {
            const textDeltaMessage: CreateQuestChatMessage[] = /^[\s\n]*$/.test(
              textDelta,
            )
              ? []
              : [{ role: "assistant", content: textDelta }];
            const latestNewMessage = newMessages.at(-1);
            if (isOptionsMessage(latestNewMessage)) {
              return [
                ...newMessages.slice(0, -1),
                {
                  ...latestNewMessage,
                  options: [...latestNewMessage.options, event.text],
                  confirmation:
                    latestNewMessage.confirmation || event.confirmation,
                },
              ];
            } else {
              return [
                ...newMessages,
                ...textDeltaMessage,
                {
                  role: "options",
                  options: [event.text],
                  confirmation: event.confirmation,
                } as OptionsMessage,
              ];
            }
          })();
          setMessages([...messagesSnapshotRef.current, ...updatedNewMessages]);
          return { newMessages: updatedNewMessages, textDelta: "" };
        }
        case "set-confidence": {
          setConfidence(event.level);
          return state;
        }
      }
    },
    [],
  );
  const { thinking, thinkingMessage, error, run } = useStreamingChat(
    start,
    handler,
  );

  const postUserMessage = useCallback(
    (content?: string) => {
      if (content) userMessageRef.current = content;
      setMessages((messages) => {
        messagesSnapshotRef.current = content
          ? [...messages, { role: "user", content }]
          : messages;
        questIntentStateSnapshotRef.current = questIntentState;
        return messagesSnapshotRef.current;
      });
      run();
    },
    [questIntentState, run],
  );

  return {
    thinking,
    thinkingMessage,
    messages,
    questIntentState,
    confidence,
    error,
    postUserMessage,
  };
};

export const useGenerateDescriptionTitle = (nameOfUser: string) => {
  const [descriptionTitle, setDescriptionTitle] =
    useState<GeneratedTitleAndDescription>({
      description: "",
      contributorTitle: "",
      seekerTitle: "",
    });

  const questIntentStateRef = useRef<QuestIntentState | null>(null);

  const start = useCallback(
    () =>
      questIntentStateRef.current
        ? getQuestTitleAndDescription(nameOfUser, questIntentStateRef.current)
        : (async function* () {
            throw new Error("No quest intent state");
          })(),
    [nameOfUser],
  );

  const handler = useCallback(
    (
      state: { descriptionTitle?: GeneratedTitleAndDescription },
      event: HandlerEvent<typeof start>,
    ) => {
      switch (event.type) {
        case "generated-title-and-description": {
          const value = event.value;
          setDescriptionTitle(value);
          return { descriptionTitle: value };
        }
        default:
          return state;
      }
    },
    [],
  );

  const { thinking, thinkingMessage, error, run } = useStreamingChat(
    start,
    handler,
  );

  const setQuestIntentState = useCallback(
    (questIntentState: QuestIntentState | null) => {
      if (thinking) return;
      if (!questIntentState) return;
      if (
        JSON.stringify(questIntentState) ===
        JSON.stringify(questIntentStateRef.current)
      )
        return;
      questIntentStateRef.current = questIntentState;
      void run();
    },
    [run, thinking],
  );

  // keep the same return shape as before
  return {
    descriptionTitle,
    thinking,
    thinkingMessage,
    error,
    setQuestIntentState,
  };
};
