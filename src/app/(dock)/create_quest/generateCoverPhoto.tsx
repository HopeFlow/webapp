import { loadBlobFromUrl, loadImageFromUrl } from "@/helpers/client/common";
import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { useCallback, useState } from "react";
import type { InsertQuestData } from "./types";
import { useDebouncedEffect } from "@/helpers/client/hooks";

export const GenerateCoverPhoto = ({
  active,
  generating,
  continueToNextStep,
}: {
  active: boolean;
  generating: boolean;
  continueToNextStep: () => void;
}) => {
  useDebouncedEffect(() => {
    if (active && !generating) continueToNextStep();
  }, [active, generating, continueToNextStep]);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      {generating && (
        <div className="flex items-center justify-center p-4">
          <span className="loading loading-bars loading-xl"></span>
          <span className="inline-block w-3"></span>
          Generating a cover photo for your quest ...
        </div>
      )}
    </div>
  );
};
