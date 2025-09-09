import { cn } from "@/helpers/client/tailwind_helpers";
import React from "react";

export type StepsProps = {
  numberOfSteps: number;
  currentStep: number;
  onClick?: (step: number) => void;
};

export function Steps({ onClick, numberOfSteps, currentStep }: StepsProps) {
  return (
    <ul className="w-full steps">
      {new Array(numberOfSteps).fill(null).map((_, i) => (
        <div
          key={`s-${i}`}
          className={cn(
            "step",
            i <= currentStep && "step-neutral",
            onClick && "cursor-pointer",
          )}
          onClick={() => onClick && onClick(i)}
        ></div>
      ))}
    </ul>
  );
}
