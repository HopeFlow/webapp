import { useGenerateDescriptionTitle } from "@/helpers/client/LLM";
import { SafeUser } from "@/helpers/server/auth";
import { CreateQuestChatMessage } from "@/helpers/server/LLM";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

export const GenerateDescriptionTitle = ({
  user,
  messages,
  setTitle,
  setDescription,
  active,
  continueToNextStep,
}: {
  user: SafeUser;
  messages: CreateQuestChatMessage[];
  setTitle: Dispatch<SetStateAction<string>>;
  setDescription: Dispatch<SetStateAction<string>>;
  active: boolean;
  continueToNextStep: () => void;
}) => {
  const conversation = useMemo(
    () =>
      `name:\n${user.firstName ?? user.lastName ?? "User"}\n` +
      messages
        .map((m) =>
          m.role === "user"
            ? `user:\n${m.content}`
            : m.role === "assistant"
              ? `bot:\n${m.content}`
              : null,
        )
        .filter((m) => m !== null)
        .join("\n"),
    [messages, user.firstName, user.lastName],
  );
  const [generationStarted, setGenerationStarted] = useState(false);
  const [descriptionTitle, thinking, thinkingMessage, setConversation] =
    useGenerateDescriptionTitle();
  useEffect(() => {
    console.log({ active });
    if (!active) return;
    Promise.resolve().then(() => {
      console.log({ f: "useEffect::active", conversation });
      setGenerationStarted(true);
      setConversation(conversation);
    });
  }, [active, conversation, setConversation]);
  useEffect(() => {
    console.log({ active, generationStarted, thinking });
    if (!active || !generationStarted || thinking) return;
    Promise.resolve().then(() => {
      setGenerationStarted(false);
      setTitle(descriptionTitle.contributorTitle);
      setDescription(descriptionTitle.description);
      continueToNextStep();
    });
  }, [
    active,
    continueToNextStep,
    descriptionTitle,
    generationStarted,
    setDescription,
    setTitle,
    thinking,
  ]);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      {thinking && (
        <div className="flex items-center justify-center p-4">
          <span className="loading loading-bars loading-xl"></span>
          <span className="inline-block w-3"></span>
          {thinkingMessage}
        </div>
      )}
    </div>
  );
};
