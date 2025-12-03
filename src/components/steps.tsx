import { cn } from "@/helpers/client/tailwind_helpers";
import React from "react";

export type StepsProps = {
  numberOfSteps: number;
  currentStep: number;
  onClick?: (step: number) => void;
  stepValidity?: boolean[];
};

export function Steps({
  onClick,
  numberOfSteps,
  currentStep,
  stepValidity,
}: StepsProps) {
  return (
    <ul className="steps w-full">
      {new Array(numberOfSteps).fill(null).map((_, i) => {
        const isReachable =
          !stepValidity ||
          stepValidity.slice(0, i).every((isValid) => isValid !== false);

        return (
          <div
            key={`s-${i}`}
            className={cn(
              "step",
              i <= currentStep && "step-neutral",
              onClick && isReachable
                ? "cursor-pointer"
                : "cursor-not-allowed after:text-gray-300 after:content-[counter(step)]",
            )}
            onClick={() => {
              if (onClick && isReachable) {
                onClick(i);
              }
            }}
          ></div>
        );
      })}
    </ul>
  );
}
