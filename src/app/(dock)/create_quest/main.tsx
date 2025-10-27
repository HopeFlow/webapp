"use client";

import { ModernForm } from "@/components/modern_form";
import { useCallback, useEffect, useState } from "react";
import { ChatWithLLM } from "./chatWithLLM";
import { ConfirmDescription } from "./confirmDescription";
import { ConfirmTitle } from "./confirmTitle";
import { Steps } from "@/components/steps";
import { ConfirmCoverPhoto } from "./confirmCoverPhoto";
// import type { QuestMedia, ScreeningAnswer, ScreeningQuestion } from "@/db/constants";
import { UploadAdditionalMedia } from "./uploadAdditionalMedia";
import { ConfirmScreeningQuestions } from "./confirmScreeningQuestions";
import { GenerateDescriptionTitle } from "./generateDescriptionTitle";
import type { CreateQuestChatMessage } from "@/helpers/server/LLM";
import { SafeUser } from "@/helpers/server/auth";
import { GenerateCoverPhoto } from "./generateCoverPhoto";
import type { InsertQuestData } from "./types";

export function CreateQuestMain({ user }: { user: SafeUser }) {
  const [gotoNextStep, setGotoNextStep] = useState(false);
  const [latestVisitedState, setLatestVisitedState] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [stableStepIndex, setStableStepIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<CreateQuestChatMessage[]>(
    [],
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverPhoto, setCoverPhoto] = useState<InsertQuestData["coverPhoto"]>();
  // const [media, setMedia] = useState<QuestMedia[]>();
  // const [screeningQuestions, setScreeningQuestions] =
  //   useState<(ScreeningQuestion & Omit<ScreeningAnswer, "questionIndex">)[]>();
  const continueToNextStep = useCallback(() => {
    setGotoNextStep(true);
  }, []);
  const formParts = [
    <ChatWithLLM
      setMessages={setChatMessages}
      continueToNextStep={continueToNextStep}
      key="chatWithLLM"
    />,
    <GenerateDescriptionTitle
      user={user}
      active={stableStepIndex === 1 && stepIndex === 1}
      messages={chatMessages}
      setTitle={setTitle}
      setDescription={setDescription}
      continueToNextStep={continueToNextStep}
      key="generateDescriptionTitle"
    />,
    <ConfirmDescription
      description={description}
      setDescription={setDescription}
      continueToNextStep={continueToNextStep}
      key={`confirmDescription-${description}`}
    />,
    <ConfirmTitle
      title={title}
      setTitle={setTitle}
      continueToNextStep={continueToNextStep}
      key={`confirmTitle-${title}`}
    />,
    <GenerateCoverPhoto
      active={stableStepIndex === 4 && stepIndex === 4}
      description={description}
      setCoverPhoto={setCoverPhoto}
      continueToNextStep={continueToNextStep}
      key="generateCoverPhoto"
    />,
    <ConfirmCoverPhoto
      title={title}
      coverPhoto={coverPhoto}
      setCoverPhoto={setCoverPhoto}
      continueToNextStep={continueToNextStep}
      key="confirmCoverPhoto"
    />,
    <UploadAdditionalMedia
      continueToNextStep={continueToNextStep}
      key="uploadAdditionalMedia"
    />,
    <ConfirmScreeningQuestions
      continueToNextStep={continueToNextStep}
      key="confirmScreeningQuestions"
    />,
  ];
  const sanitizedSetStepIndex = useCallback(
    (targetStepIndex: number) => {
      let santizedTargetStepIndex = Math.max(
        0,
        Math.min(targetStepIndex, formParts.length - 1),
      );
      if (santizedTargetStepIndex > latestVisitedState) {
        if (santizedTargetStepIndex > 0) {
          if (chatMessages.length < 1) santizedTargetStepIndex = 0;
        }
        if (santizedTargetStepIndex > 2) {
          if (!description || description.trim() === "")
            santizedTargetStepIndex = 2;
        }
        if (santizedTargetStepIndex > 3) {
          if (!title || title.trim() === "") santizedTargetStepIndex = 3;
        }
      }
      setStepIndex(santizedTargetStepIndex);
    },
    [
      formParts.length,
      latestVisitedState,
      chatMessages.length,
      description,
      title,
    ],
  );
  useEffect(() => {
    if (gotoNextStep) {
      queueMicrotask(() => {
        setGotoNextStep(false);
        sanitizedSetStepIndex(stepIndex + 1);
      });
    }
  }, [gotoNextStep, sanitizedSetStepIndex, stepIndex]);
  return (
    <div className="flex h-full w-full flex-col">
      <Steps
        numberOfSteps={formParts.length}
        currentStep={stableStepIndex}
        onClick={(step: number) => {
          sanitizedSetStepIndex(step);
        }}
      />
      <ModernForm
        className="h-auto flex-1"
        itemIndex={stepIndex}
        onItemIndexChange={(index) => {
          setStableStepIndex(index);
          setLatestVisitedState(index);
        }}
      >
        {formParts}
      </ModernForm>
    </div>
  );
}
