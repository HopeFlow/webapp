import { Button } from "@/components/button";
import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";
import { useState, type Dispatch, type SetStateAction } from "react";

export const Step3 = ({
  title,
  setTitle,
  continueToNextStep,
}: {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  continueToNextStep: () => void;
}) => {
  const [value, setValue] = useState(title);
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className={cn(
          "w-full max-w-4xl p-4 md:p-8 flex-1 flex flex-col gap-4 justify-center",
        )}
      >
        <h1 className="font-normal text-2xl">
          What about this title? Do you approve? if not, change it
        </h1>
        <input
          className="input text-lg w-full"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          buttonType="primary"
          onClick={() => {
            setTitle(value);
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
