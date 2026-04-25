"use client";

import { Button, GhostButton } from "@/components/button";
import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { PlusIcon } from "@/components/icons/plus";
import { TrashIcon } from "@/components/icons/trash";
import type { ScreeningQuestion } from "@/db/constants";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useState } from "react";

const normalizeDraft = (question: string, answer: string) => ({
  question: question.trim(),
  answer: answer.trim(),
});

export const ConfirmScreeningQuestions = ({
  screeningQuestions,
  setScreeningQuestions,
  continueToNextStep,
}: {
  screeningQuestions: ScreeningQuestion[];
  setScreeningQuestions: (questions: ScreeningQuestion[]) => void;
  continueToNextStep: () => void;
}) => {
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftAnswerRequired, setDraftAnswerRequired] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempScreeningQuestions, setTempScreeningQuestions] =
    useState(screeningQuestions);

  const { question: normalizedDraftQuestion, answer: normalizedDraftAnswer } =
    normalizeDraft(draftQuestion, draftAnswer);
  const canSaveDraft = Boolean(
    normalizedDraftQuestion && normalizedDraftAnswer,
  );

  const resetDraft = () => {
    setDraftQuestion("");
    setDraftAnswer("");
    setDraftAnswerRequired(false);
    setEditingIndex(null);
  };

  const saveDraft = () => {
    if (!canSaveDraft) return;

    const nextQuestion = {
      question: normalizedDraftQuestion,
      answer: normalizedDraftAnswer,
      answerRequired: draftAnswerRequired,
    };

    if (editingIndex === null) {
      setTempScreeningQuestions([...tempScreeningQuestions, nextQuestion]);
    } else {
      setTempScreeningQuestions(
        tempScreeningQuestions.map((question, index) =>
          index === editingIndex ? nextQuestion : question,
        ),
      );
    }

    resetDraft();
  };

  const startEdit = (index: number) => {
    const question = tempScreeningQuestions[index];
    if (!question) return;
    setDraftQuestion(question.question);
    setDraftAnswer(question.answer);
    setDraftAnswerRequired(question.answerRequired);
    setEditingIndex(index);
  };

  const deleteQuestion = (index: number) => {
    setTempScreeningQuestions(
      tempScreeningQuestions.filter(
        (_, questionIndex) => questionIndex !== index,
      ),
    );
    if (editingIndex === index) {
      resetDraft();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex h-full w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
        )}
      >
        <h1 className="text-2xl font-normal">
          Add screening questions (optional)
        </h1>
        <div className="flex flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto">
          {tempScreeningQuestions.length > 0 ? (
            <ul className="flex w-full flex-col gap-4">
              {tempScreeningQuestions.map((q, index) => (
                <li
                  key={`${q.question}-${index}`}
                  className="bg-base-200 rounded-box flex shrink-0 flex-row gap-2 p-4"
                >
                  <div className="ml-auto flex flex-1 flex-col gap-1">
                    <h3 className="font-normal">
                      <b>Q-{index + 1}: </b>
                      {q.question}
                    </h3>
                    <p className="font-thin">{q.answer}</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="toggle"
                        checked={q.answerRequired}
                        disabled
                      />
                      &nbsp;{q.answerRequired ? "Required" : "Not required"}
                    </label>
                  </div>
                  <div className="ml-auto flex flex-col gap-2">
                    <GhostButton
                      aria-label={`Delete screening question ${index + 1}`}
                      onClick={() => {
                        deleteQuestion(index);
                      }}
                    >
                      <TrashIcon />
                    </GhostButton>
                    <GhostButton
                      aria-label={`Edit screening question ${index + 1}`}
                      onClick={() => {
                        startEdit(index);
                      }}
                    >
                      <PencilSquareIcon />
                    </GhostButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-warning/20 text-warning-content rounded-box w-full p-4">
              Automatic screening can not be done without screening questions,
              and you may get more spam or unpromising leads.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Enter your question here"
            value={draftQuestion}
            aria-invalid={draftQuestion.length > 0 && !normalizedDraftQuestion}
            onChange={(e) => {
              setDraftQuestion(e.target.value);
            }}
          />
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Enter required response here"
            value={draftAnswer}
            aria-invalid={draftAnswer.length > 0 && !normalizedDraftAnswer}
            onChange={(e) => {
              setDraftAnswer(e.target.value);
            }}
          />
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="toggle peer"
              checked={draftAnswerRequired}
              onChange={(e) => {
                setDraftAnswerRequired(e.target.checked);
              }}
            />
            <span className="peer-checked:hidden">Not required</span>
            <span className="hidden peer-checked:inline">Required</span>
          </label>
          {!canSaveDraft &&
          (draftQuestion.length > 0 || draftAnswer.length > 0) ? (
            <p className="text-error text-sm">
              Both question and answer are required.
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-row gap-2">
          <Button
            buttonType="secondary"
            onClick={saveDraft}
            disabled={!canSaveDraft}
            className="flex-1"
          >
            <PlusIcon />{" "}
            {editingIndex === null ? "Add Question" : "Save Changes"}
          </Button>
          {editingIndex !== null ? (
            <Button
              buttonType="secondary"
              buttonStyle="outline"
              onClick={resetDraft}
              className="flex-1"
            >
              Cancel Edit
            </Button>
          ) : null}
          <Button
            className={cn("flex-1", editingIndex !== null && "md:flex-none")}
            buttonType="primary"
            onClick={() => {
              setScreeningQuestions(tempScreeningQuestions);
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
