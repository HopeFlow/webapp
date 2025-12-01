import { cn } from "@/helpers/client/tailwind_helpers";
import React from "react";

export type StepsProps = {
  numberOfSteps: number;
  currentStep: number;
  onClick?: (step: number) => void;
};

const maxVisibleSteps = 7;

export function Steps({ onClick, numberOfSteps, currentStep }: StepsProps) {
  const visibleSteps = (() => {
    if (numberOfSteps <= maxVisibleSteps)
      return new Array(numberOfSteps).fill(null).map((_, i) => i);
    const [from, to] = (() => {
      const h0 = Math.ceil((maxVisibleSteps - 5) / 2);
      const h1 = maxVisibleSteps - 5;
      let from = 0;
      let to = numberOfSteps;
      if (2 * currentStep <= numberOfSteps) {
        from = Math.max(0, currentStep - h0);
        to = Math.min(numberOfSteps, from + h1 + 1 + Math.max(0, 2 - from));
      } else {
        to = Math.min(numberOfSteps, currentStep + h0 + 1);
        from = Math.max(0, to - h1 - 1 - Math.max(0, to - numberOfSteps + 2));
      }
      return [
        from <= 2 ? 0 : from,
        to >= numberOfSteps - 2 ? numberOfSteps : to,
      ];
    })();
    const result = [
      ...(from === 0 ? [] : from === 1 ? [0] : [0, -1]),
      ...new Array(
        (to === numberOfSteps - 1 ? numberOfSteps : to) -
          (from === 1 ? 0 : from),
      )
        .fill(null)
        .map((_, i) => from + i),
      ...(to === numberOfSteps
        ? []
        : to === numberOfSteps - 1
          ? [numberOfSteps - 1]
          : [-1, numberOfSteps - 1]),
    ];
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
