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
import type { QuestIntentState } from "@/helpers/server/LLM";
import { SafeUser } from "@/helpers/server/auth";
import { GenerateCoverPhoto } from "./generateCoverPhoto";
import type { InsertQuestData } from "./types";
import { ConfirmQuestType } from "./confirmQuestType";
import { Overview } from "./overview";
import { useInsertQuest } from "@/server_actions/client/create_quest/insertQuest";

export function CreateQuestMain({ user }: { user: SafeUser }) {
  const [gotoNextStep, setGotoNextStep] = useState(false);
  const [latestVisitedState, setLatestVisitedState] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [stableStepIndex, setStableStepIndex] = useState(0);
  const [userChatMessageCount, setUserChatMessageCount] = useState(0);
  const [questIntentState, setQuestIntentState] =
    useState<QuestIntentState | null>(null);

  const [
    { type, title, shareTitle, description, rewardAmount, coverPhoto, media },
    setInserQuestData,
  ] = useState<Partial<InsertQuestData>>({
    type: "unrestricted",
    rewardAmount: 500,
  });
  const {
    create: { mutateAsync: createQuest, isPending: isCreatingQuest },
  } = useInsertQuest();

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

  const continueToNextStep = useCallback(() => {
    setGotoNextStep(true);
  }, []);

  const canCreateQuest =
    Boolean(
      type &&
        title?.trim() &&
        shareTitle?.trim() &&
        description?.trim() &&
        coverPhoto,
    ) && !isCreatingQuest;

  const handleCreateQuest = useCallback(async () => {
    if (
      !type ||
      !title?.trim() ||
      !shareTitle?.trim() ||
      !description?.trim() ||
      !coverPhoto
    ) {
      console.warn("Attempted to create quest with incomplete data");
      return;
    }

    try {
      await createQuest({
        type,
        title: title.trim(),
        shareTitle: shareTitle.trim(),
        description: description.trim(),
        rewardAmount: Number.isFinite(rewardAmount) ? Number(rewardAmount) : 0,
        coverPhoto,
        media: media ?? [],
      });
    } catch (error) {
      console.error("Failed to create quest", error);
    }
  }, [
    type,
    title,
    shareTitle,
    description,
    coverPhoto,
    rewardAmount,
    media,
    createQuest,
  ]);

  const formPartsAndSpecs: Array<ReactNode | [ReactNode, boolean]> = [
    <ChatWithLLM
      setUserChatMessageCount={setUserChatMessageCount}
      setQuestIntentState={setQuestIntentState}
      continueToNextStep={continueToNextStep}
      key="chatWithLLM"
    />,
    [
      <GenerateDescriptionTitle
        user={user}
        active={stableStepIndex === 1 && stepIndex === 1}
        questIntentState={questIntentState}
        setTitle={setTitle}
        setShareTitle={setShareTitle}
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
      shareTitle={shareTitle ?? ""}
      setTitle={setTitle}
      setShareTitle={setShareTitle}
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
      media={media ?? []}
      setMedia={setMedia}
      continueToNextStep={continueToNextStep}
      key="uploadAdditionalMedia"
    />,
    <ConfirmScreeningQuestions
      continueToNextStep={continueToNextStep}
      key="confirmScreeningQuestions"
    />,
    <ConfirmQuestType
      continueToNextStep={continueToNextStep}
      setType={setType}
      type={type ?? "restricted"}
      key="confirmQuestType"
    />,
    <Overview
      coverPhoto={coverPhoto}
      title={title ?? ""}
      shareTitle={shareTitle ?? ""}
      description={description ?? ""}
      rewardAmount={rewardAmount ?? 0}
      onCreateQuest={handleCreateQuest}
      disableCreate={!canCreateQuest}
      isCreating={isCreatingQuest}
      key="overview"
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
          if (userChatMessageCount < 1) santizedTargetStepIndex = 0;
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
      userChatMessageCount,
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
        numberOfSteps={
          formPartsAndSpecs.filter((v) => !Array.isArray(v) || v[1]).length
        }
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
