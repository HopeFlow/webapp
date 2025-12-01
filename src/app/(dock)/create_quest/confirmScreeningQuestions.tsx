"use client";

import { Button, GhostButton } from "@/components/button";
import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { PlusIcon } from "@/components/icons/plus";
import { TrashIcon } from "@/components/icons/trash";
import type { ScreeningAnswer, ScreeningQuestion } from "@/db/constants";
import { cn } from "@/helpers/client/tailwind_helpers";
import {
  useState,
} from "react";

export const ConfirmScreeningQuestions = ({
  continueToNextStep,
}: {
  continueToNextStep: () => void;
}) => {
  const [screeningQuestions] = useState<
    (ScreeningQuestion & Omit<ScreeningAnswer, "questionIndex">)[]
  >([
    {
      question:
        "What specific detail can you share that a random person wouldn’t know?",
      answer: "I have a scar on my left cheek.",
      answerRequired: true,
    },
    {
      question:
        "What specific detail can you share that a random person wouldn’t know?",
      answer: "I have a scar on my left cheek.",
      answerRequired: true,
    },
  ]);
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className={cn(
          "w-full h-full max-w-4xl p-4 md:p-8 flex-1 flex flex-col gap-4 justify-center",
        )}
      >
        <h1 className="font-normal text-2xl">
          Add screening questions (optional)
        </h1>
        <div className="flex-1 flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto">
          {screeningQuestions && screeningQuestions.length && (
            <ul className="flex flex-col gap-4 w-full">
              {screeningQuestions.map((q, index) => (
                <li key={index} className="flex flex-row gap-2 shrink-0">
                  <div className="flex-1 flex flex-col ml-auto gap-1">
                    <h3 className="font-normal">
                      <b>Q-{index + 1}: </b>
                      {q.question}
                    </h3>
                    <p className="font-thin">{q.answer}</p>
                    <label>
                      <input
                        type="checkbox"
                        className="toggle"
                        checked={q.answerRequired}
                        disabled
                      />
                      &nbsp;{q.answerRequired ? "Required" : "Not required"}
                    </label>
                  </div>
                  <div className="flex flex-col ml-auto gap-2">
                    <GhostButton>
                      <TrashIcon />
                    </GhostButton>
                    <GhostButton>
                      <PencilSquareIcon />
                    </GhostButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Enter your question here"
          />
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Enter required response here"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="toggle peer" />
            <span className="peer-checked:hidden">Not required</span>
            <span className="hidden peer-checked:inline">Required</span>
          </label>
        </div>
        <div className="w-full flex flex-row gap-2">
          <Button buttonType="secondary" onClick={() => {}} className="flex-1">
            <PlusIcon /> Add Question
          </Button>
          <Button
            className="flex-1"
            buttonType="primary"
            onClick={() => {
              continueToNextStep();
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
