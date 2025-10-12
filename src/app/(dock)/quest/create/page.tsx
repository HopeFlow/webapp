"use client";

import { ModernForm } from "@/components/modern_form";
import { useCallback, useMemo, useState } from "react";
import { Step1 } from "./step1";
import { Step2 } from "./step2";
import { Step3 } from "./step3";
import { Steps } from "@/components/steps";
import { Step4 } from "./step4";
import { QuestMedia, ScreeningAnswer, ScreeningQuestion } from "@/db/constants";
import { Step5 } from "./step5";
import { Step6 } from "./step6";

export default function Create() {
  const [latestVisitedState, setLatestVisitedState] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [stableStepIndex, setStableStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File>();
  const [media, setMedia] = useState<QuestMedia[]>();
  const [screeningQuestions, setScreeningQuestions] =
    useState<(ScreeningQuestion & Omit<ScreeningAnswer, "questionIndex">)[]>();
  const sanitizeStepIndex = useCallback(
    (targetStepIndex: number) => {
      targetStepIndex = Math.max(0, Math.min(targetStepIndex, steps.length));
      return targetStepIndex;
      if (targetStepIndex > latestVisitedState) {
        switch (targetStepIndex) {
          case 1:
            if (!description || description.trim() === "") return stepIndex;
            break;
          case 2:
            if (!title || title.trim() === "") return stepIndex;
            break;
        }
      }
      return targetStepIndex;
    },
    [stepIndex, latestVisitedState, title, description],
  );
  const continueToNextStep = useCallback(() => {
    setStepIndex((stepIndex) => {
      const nextStepIndex = sanitizeStepIndex(stepIndex + 1);
      setLatestVisitedState((s) => Math.max(s, nextStepIndex));
      return nextStepIndex;
    });
  }, [sanitizeStepIndex]);
  const steps = useMemo(
    () => [
      <Step1
        setTitle={setTitle}
        setDescription={setDescription}
        continueToNextStep={continueToNextStep}
        key="step1"
      />,
      <Step2
        description={description}
        setDescription={setDescription}
        continueToNextStep={continueToNextStep}
        key="step2"
      />,
      <Step3
        title={title}
        setTitle={setTitle}
        continueToNextStep={continueToNextStep}
        key="step3"
      />,
      <Step4
        title={title}
        coverImage={coverImage}
        setCoverImage={setCoverImage}
        continueToNextStep={continueToNextStep}
        key="step4"
      />,
      <Step5 continueToNextStep={continueToNextStep} key="step5" />,
      <Step6 continueToNextStep={continueToNextStep} key="step6" />,
    ],
    [description, title, continueToNextStep],
  );
  return (
    <div className="w-full h-full flex flex-col">
      <Steps
        numberOfSteps={steps.length}
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
          setStepIndex(sanitizeStepIndex(index));
        }}
      >
        {steps}
      </ModernForm>
    </div>
  );
}
