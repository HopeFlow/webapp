"use client";

import { ModernForm } from "@/components/modern_form";
import { ReactNode, useCallback, useEffect, useState } from "react";
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

  const [
    {
      type,
      title,
      shareTitle,
      description,
      rewardAmount,
      coverPhoto,
      media,
      farewellMessage,
    },
    setInserQuestData,
  ] = useState<Partial<InsertQuestData>>({ rewardAmount: "10" });

  const setType = useCallback(
    (v: typeof type) => setInserQuestData((d) => ({ ...d, type: v })),
    [],
  );
  const setTitle = useCallback(
    (v: typeof title) => setInserQuestData((d) => ({ ...d, title: v })),
    [],
  );
  const setShareTitle = useCallback(
    (v: typeof shareTitle) =>
      setInserQuestData((d) => ({ ...d, shareTitle: v })),
    [],
  );
  const setDescription = useCallback(
    (v: typeof description) =>
      setInserQuestData((d) => ({ ...d, description: v })),
    [],
  );
  const setCoverPhoto = useCallback(
    (v: typeof coverPhoto) =>
      setInserQuestData((d) => ({ ...d, coverPhoto: v })),
    [],
  );
  const setMedia = useCallback(
    (v: typeof media) => setInserQuestData((d) => ({ ...d, media: v })),
    [],
  );
  const setFarewellMessage = useCallback(
    (v: typeof farewellMessage) =>
      setInserQuestData((d) => ({ ...d, farewellMessage: v })),
    [],
  );

  const continueToNextStep = useCallback(() => {
    setGotoNextStep(true);
  }, []);

  const formPartsAndSpecs: Array<ReactNode | [ReactNode, boolean]> = [
    <ChatWithLLM
      setMessages={setChatMessages}
      continueToNextStep={continueToNextStep}
      key="chatWithLLM"
    />,
    [
      <GenerateDescriptionTitle
        user={user}
        active={stableStepIndex === 1 && stepIndex === 1}
        messages={chatMessages}
        setTitle={setTitle}
        setDescription={setDescription}
        continueToNextStep={continueToNextStep}
        key="generateDescriptionTitle"
      />,
      false,
    ],
    <ConfirmDescription
      description={description ?? ""}
      setDescription={setDescription}
      continueToNextStep={continueToNextStep}
      key={`confirmDescription-${description}`}
    />,
    <ConfirmTitle
      title={title ?? ""}
      setTitle={setTitle}
      continueToNextStep={continueToNextStep}
      key={`confirmTitle-${title}`}
    />,
    [
      <GenerateCoverPhoto
        active={stableStepIndex === 4 && stepIndex === 4}
        description={description ?? ""}
        setCoverPhoto={setCoverPhoto}
        continueToNextStep={continueToNextStep}
        key="generateCoverPhoto"
      />,
      false,
    ],
    <ConfirmCoverPhoto
      title={title ?? ""}
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
  const formParts = formPartsAndSpecs.map((p) => (Array.isArray(p) ? p[0] : p));
  const formPartIndexes = formPartsAndSpecs.reduce(
    ({ lastIndex, result }, v) =>
      Array.isArray(v) && !v[1]
        ? { lastIndex: lastIndex, result: [...result, lastIndex] }
        : { lastIndex: lastIndex + 1, result: [...result, lastIndex] },
    { lastIndex: 0, result: [] } as { lastIndex: number; result: number[] },
  ).result;
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
        numberOfSteps={formPartIndexes[formPartIndexes.length - 1] ?? 0}
        currentStep={formPartIndexes[stableStepIndex]}
        onClick={(step: number) => {
          const index = formPartIndexes.lastIndexOf(step);
          sanitizedSetStepIndex(index);
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
