import { cn } from "@/helpers/client/tailwind_helpers";
import React from "react";

export type StepsProps = {
  numberOfSteps: number;
  currentStep: number;
  onClick?: (step: number) => void;
};

export function Steps({ onClick, numberOfSteps, currentStep }: StepsProps) {
  const visibleSteps = (() => {
    if (numberOfSteps < 7)
      return new Array(numberOfSteps).fill(null).map((_, i) => i);
    const [from, to] = ((s, e) => {
      const from = Math.max(0, Math.min(e - 5, s));
      return [from, e];
    })(
      currentStep > 2 ? currentStep - 1 : 0,
      currentStep < numberOfSteps - 4 ? currentStep + 2 : numberOfSteps,
    );
    console.log({ from, to, currentStep, numberOfSteps });
    const result = [
      ...(from === 0 ? [] : [0, -1]),
      ...new Array(to - from).fill(null).map((_, i) => from + i),
      ...(to === numberOfSteps ? [] : [-1, numberOfSteps - 1]),
    ];
    console.log({ result });
    return result;
  })();
  return (
    <ul className="steps w-full">
      {visibleSteps.map((i, j) => (
        <div
          key={i < 0 ? `s-n-${j}` : `s-${i}`}
          className={cn(
            "step",
            i >= 0 && i <= currentStep && "step-neutral",
            onClick && "cursor-pointer",
          )}
          onClick={() => i >= 0 && onClick && onClick(i)}
        >
          <span className="step-icon">{i < 0 ? "..." : i + 1}</span>
        </div>
      ))}
    </ul>
  );
}
