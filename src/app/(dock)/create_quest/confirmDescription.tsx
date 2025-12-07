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
    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
        )}
      >
        <h1 className="text-2xl font-normal">
          Does this description adequately convey the quest? if not, change it
          😄
        </h1>
        <textarea
          className="textarea min-h-48 w-full text-lg"
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
