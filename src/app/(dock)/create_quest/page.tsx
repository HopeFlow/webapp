"use client";

import { ModernForm } from "@/components/modern_form";
import { useCallback, useState } from "react";
import { Step1 } from "./step1";
import { Step2 } from "./step2";
import { Step3 } from "./step3";
import { Steps } from "@/components/steps";
import { Step4 } from "./step4";
// import type { QuestMedia, ScreeningAnswer, ScreeningQuestion } from "@/db/constants";
import { Step5 } from "./step5";
import { Step6 } from "./step6";

export default function Create() {
  const [latestVisitedState, setLatestVisitedState] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [stableStepIndex, setStableStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File>();
  // const [media, setMedia] = useState<QuestMedia[]>();
  // const [screeningQuestions, setScreeningQuestions] =
  //   useState<(ScreeningQuestion & Omit<ScreeningAnswer, "questionIndex">)[]>();
  const sanitizeStepIndex = useCallback(
    (targetStepIndex: number) => {
      const santizedTargetStepIndex = Math.max(0, Math.min(targetStepIndex, 6));
      if (santizedTargetStepIndex > latestVisitedState) {
        switch (santizedTargetStepIndex) {
          case 1:
            if (!description || description.trim() === "") return stepIndex;
            break;
          case 2:
            if (!title || title.trim() === "") return stepIndex;
            break;
        }
      }
      return santizedTargetStepIndex;
    },
    [latestVisitedState, description, stepIndex, title],
  );
  const continueToNextStep = useCallback(() => {
    const nextStepIndex = sanitizeStepIndex(stableStepIndex + 1);
    setLatestVisitedState((s) => Math.max(s, nextStepIndex));
    setStepIndex(nextStepIndex);
  }, [sanitizeStepIndex, stableStepIndex]);
  return (
    <div className="flex h-full w-full flex-col">
      <Steps
        numberOfSteps={6}
        currentStep={stableStepIndex}
        onClick={(step: number) => {
          setStepIndex(sanitizeStepIndex(step));
        }}
      />
      <ModernForm
        className="h-auto flex-1"
        itemIndex={stepIndex}
        onItemIndexChange={(index) => {
          setStableStepIndex(index);
        }}
      >
        <Step1
          setTitle={setTitle}
          setDescription={setDescription}
          continueToNextStep={continueToNextStep}
          key="step1"
        />
        <Step2
          description={description}
          setDescription={setDescription}
          continueToNextStep={continueToNextStep}
          key="step2"
        />
        <Step3
          title={title}
          setTitle={setTitle}
          continueToNextStep={continueToNextStep}
          key="step3"
        />
        <Step4
          title={title}
          coverImage={coverImage}
          setCoverImage={setCoverImage}
          continueToNextStep={continueToNextStep}
          key="step4"
        />
        <Step5 continueToNextStep={continueToNextStep} key="step5" />
        <Step6 continueToNextStep={continueToNextStep} key="step6" />
      </ModernForm>
    </div>
  );
}
