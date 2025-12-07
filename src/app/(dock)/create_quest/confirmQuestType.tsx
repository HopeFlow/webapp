import { cn } from "@/helpers/client/tailwind_helpers";
import type { InsertQuestData } from "./types";
import { Button } from "@/components/button";
import { useState } from "react";

export const ConfirmQuestType = ({
  type,
  setType,
  continueToNextStep,
}: {
  type: InsertQuestData["type"];
  setType: (type: InsertQuestData["type"]) => void;
  continueToNextStep: () => void;
}) => {
  const [value, setValue] = useState(type);
  return (
    <div className="flex max-w-full flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
        )}
      >
        <h1 className="text-2xl font-normal">
          How do you want to conduct your quest?
        </h1>
        <label className="radio-label label w-full cursor-pointer whitespace-normal">
          <input
            type="radio"
            className="radio radio-sm"
            name="type"
            value="targeted"
            checked={value === "restricted"}
            onChange={(e) => e.target.checked && setValue("restricted")}
          />{" "}
          ReFlow is restricted only to people who the contributor directly knows
        </label>
        <label className="radio-label label w-full cursor-pointer whitespace-normal">
          <input
            type="radio"
            className="radio radio-sm"
            name="type"
            value="targeted"
            checked={value === "unrestricted"}
            onChange={(e) => e.target.checked && setValue("unrestricted")}
          />{" "}
          Contributors can share with groups of people too
        </label>
        <Button
          buttonType="primary"
          onClick={() => {
            setType(value);
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
