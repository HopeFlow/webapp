import { Button } from "@/components/button";
// import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { cn } from "@/helpers/client/tailwind_helpers";
// import Image from "next/image";
import { useState } from "react";

export const ConfirmTitle = ({
  title,
  shareTitle,
  setTitle,
  setShareTitle,
  continueToNextStep,
}: {
  title: string;
  shareTitle: string;
  setTitle: (v: string) => void;
  setShareTitle: (v: string) => void;
  continueToNextStep: () => void;
}) => {
  const [forSeeker, setForSeeker] = useState(title);
  const [forContributor, setForContributor] = useState(shareTitle);
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
        )}
      >
        <h1 className="text-2xl font-normal">
          What about this title? Do you approve? if not, change it
        </h1>
        <h2>Title as displayed for you:</h2>
        <input
          className="input w-full text-lg"
          value={forSeeker}
          onChange={(e) => setForSeeker(e.target.value)}
        />
        <h2>Title as displayed for your connections:</h2>
        <input
          className="input w-full text-lg"
          value={forContributor}
          onChange={(e) => setForContributor(e.target.value)}
        />
        <Button
          buttonType="primary"
          onClick={() => {
            setTitle(forSeeker);
            setShareTitle(forContributor);
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
