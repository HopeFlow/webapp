"use client";

import { Modal, showModal } from "@/components/modal";
import React, { Fragment, useState } from "react";
import { cn } from "@/helpers/client/tailwind_helpers";
import { ExclamationCircleIcon } from "@/components/icons/exclamation_circle";
import Image from "next/image";
import { Steps } from "@/components/steps";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { debounce } from "@/helpers/client/functions";
import type { ScreeningQuestion as ScreeningQuestionWithAnswer } from "@/db/constants";
import { ModernFormModal } from "@/components/modern_form";

type ScreeningQuestion = Omit<ScreeningQuestionWithAnswer, "answer">;

const modalId = "global-modal-submit-answer";

export const showSubmitAnswerModal = () => {
  showModal(modalId);
};

const Step = ({
  question,
  index,
}: {
  index: number;
  question: ScreeningQuestion;
}) => {
  return (
    <div className="flex-1 flex flex-col gap-4">
      <div>
        {index === 1 && (
          <h2 className="font-normal text-2xl">
            Please help us speed up the process by answering these questions
          </h2>
        )}
        <h3 className="font-normal">
          Question {index}:{" "}
          {question.answerRequired && (
            <span className="text-error">(required)</span>
          )}
        </h3>
        <label>{question.question}</label>
      </div>
      <textarea className="textarea h-36 w-full text-lg resize-none" />
    </div>
  );
};

export const SubmitAnswerModal = ({
  questions,
}: {
  questions: ScreeningQuestion[];
}) => {
  return (
    <ModernFormModal modalId={modalId}>
      {questions.map((question, index) => (
        <Step key={index} index={index + 1} question={question} />
      ))}
    </ModernFormModal>
  );
};
