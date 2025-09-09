"use client";

import { Modal, showModal } from "@/components/modal";
import { useState } from "react";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { Steps } from "@/components/steps";

export const showCreateQuestModal = () => {
  showModal("global-modal-create-quest");
};

export const CreateQuestModal = () => {
  const [step, setStep] = useState(0);
  const stepProps = [
    {
      label: "I want to ReFlow to",
      type: "select",
      items: ["A small circle", "Someone I know"],
    },
    {
      label: "Surname",
      type: "input",
    },
    {
      label: "Description",
      type: "textarea",
    },
  ];
  return (
    <Modal
      id="global-modal-create-quest"
      onClose={() => setStep(0)}
      header={
        <Steps
          currentStep={step}
          numberOfSteps={stepProps.length}
          onClick={(step) => setStep(step)}
        />
      }
      defaultButton={{
        children:
          step === stepProps.length - 1 ? (
            <>Submit</>
          ) : (
            <>
              Next <ArrowRightIcon />
            </>
          ),
        className: "w-24",
        onClick: (close) => {
          if (step < stepProps.length - 1) setStep(step + 1);
          else close();
        },
      }}
      cancelButton={{
        children: "Cancel",
        onClick: (close) => close(),
      }}
    >
      <div className="w-full h-full carousel carousel-horizontal carousel-center">
        {stepProps.map(({ label, type, items }, stepIndex) => (
          <div
            key={`step-${stepIndex}`}
            className="w-full h-full p-2 carousel-item flex flex-col items-center justify-center"
            ref={(stepContainer) => {
              if (!stepContainer) return;
              if (stepIndex === step) {
                stepContainer.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <div className="flex flex-col gap-2 w-[90%]">
              <label className="text-xl mb-4">{label}</label>
              {type === "input" && (
                <input className="input text-lg w-full" placeholder={label} />
              )}
              {type === "textarea" && (
                <textarea
                  className="textarea text-lg h-24 w-full resize-none"
                  placeholder={label}
                ></textarea>
              )}
              {type === "select" &&
                items &&
                items.map((item, index) => (
                  <label key={`si-${index}`}>
                    <input
                      type="radio"
                      className="radio"
                      name="temp"
                      onChange={() =>
                        setTimeout(() => setStep((s) => s + 1), 350)
                      }
                    />{" "}
                    {item}
                  </label>
                ))}
              {type === "input" && (
                <div className="w-full text-xs">
                  Press <span className="kbd kbd-xs">⏎</span> to continue
                </div>
              )}
              {type === "textarea" && (
                <div className="w-full text-xs">
                  Press <span className="kbd kbd-xs">Ctrl+⏎</span> to continue
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
