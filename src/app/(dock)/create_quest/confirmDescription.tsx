import { Button } from "@/components/button";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useState } from "react";

export const ConfirmDescription = ({
  description,
  setDescription,
  continueToNextStep,
}: {
  description: string;
  setDescription: (v: string) => void;
  continueToNextStep: () => void;
}) => {
  const [value, setValue] = useState(description);
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className={cn(
          "w-full max-w-4xl p-4 md:p-8 flex-1 flex flex-col gap-4 justify-center",
        )}
      >
        <h1 className="font-normal text-2xl">
          Does this description adequately convey the quest? if not, change it
          😄
        </h1>
        <textarea
          className="textarea text-lg w-full min-h-48"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          buttonType="primary"
          onClick={() => {
            setDescription(value);
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
