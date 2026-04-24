import { Button } from "@/components/button";
// import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { cn } from "@/helpers/client/tailwind_helpers";
// import Image from "next/image";
import { useState } from "react";

const parseRewardInput = (input: string) => {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { valid: true, rewardAmount: undefined };
  }

  const rewardAmount = Number(trimmed);
  if (!Number.isFinite(rewardAmount) || rewardAmount < 0) {
    return { valid: false, rewardAmount: undefined };
  }

  return {
    valid: true,
    rewardAmount: rewardAmount === 0 ? undefined : rewardAmount,
  };
};

export const SetReward = ({
  rewardAmount,
  setRewardAmount,
  continueToNextStep,
}: {
  rewardAmount?: number;
  setRewardAmount: (v: number | undefined) => void;
  continueToNextStep: () => void;
}) => {
  const [rewardInput, setRewardInput] = useState(
    typeof rewardAmount === "number" ? String(rewardAmount) : "",
  );
  const parsedReward = parseRewardInput(rewardInput);
  const showRewardError = !parsedReward.valid;

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
        )}
      >
        <h1 className="text-2xl font-normal">
          Do you want to set a reward? If so, put the amount here.
        </h1>
        <label className={cn("input pr-0", showRewardError && "input-error")}>
          $
          <input
            type="number"
            className="w-full flex-1 bg-transparent text-lg focus:ring-0 focus:outline-0"
            value={rewardInput}
            min="0"
            aria-invalid={showRewardError}
            aria-describedby="reward-validation-message"
            onChange={(e) => {
              setRewardInput(e.target.value);
            }}
          />
        </label>
        <p
          id="reward-validation-message"
          className={showRewardError ? "text-error text-sm" : "hidden"}
        >
          Either enter a positive value or leave empty
        </p>
        <Button
          buttonType="primary"
          disabled={!parsedReward.valid}
          onClick={() => {
            if (!parsedReward.valid) return;
            setRewardAmount(parsedReward.rewardAmount);
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
