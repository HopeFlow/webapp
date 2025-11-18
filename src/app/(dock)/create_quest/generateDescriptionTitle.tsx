import { useGenerateDescriptionTitle } from "@/helpers/client/LLM";
import { SafeUser } from "@/helpers/server/auth";
import type { QuestIntentState } from "@/helpers/server/LLM";
import { useEffect, useState } from "react";

export const GenerateDescriptionTitle = ({
  user,
  questIntentState,
  setTitle,
  setShareTitle,
  setDescription,
  active,
  continueToNextStep,
}: {
  user: SafeUser;
  questIntentState: QuestIntentState | null;
  setTitle: (v: string) => void;
  setShareTitle: (v: string) => void;
  setDescription: (v: string) => void;
  active: boolean;
  continueToNextStep: () => void;
}) => {
  const [generationStarted, setGenerationStarted] = useState(false);
  const { descriptionTitle, thinking, thinkingMessage, setQuestIntentState } =
    useGenerateDescriptionTitle(user.firstName ?? "User");
  useEffect(() => {
    if (!active) return;
    Promise.resolve().then(() => {
      setGenerationStarted(true);
      setQuestIntentState(questIntentState);
    });
  }, [active, questIntentState, setQuestIntentState]);
  useEffect(() => {
    if (!active || !generationStarted || thinking) return;
    Promise.resolve().then(() => {
      setGenerationStarted(false);
      setTitle(descriptionTitle.seekerTitle);
      setShareTitle(descriptionTitle.contributorTitle);
      setDescription(descriptionTitle.description);
      continueToNextStep();
    });
  }, [
    active,
    continueToNextStep,
    descriptionTitle,
    generationStarted,
    setDescription,
    setShareTitle,
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
