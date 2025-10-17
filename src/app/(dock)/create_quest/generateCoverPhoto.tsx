import { loadImageFromUrl, timeout } from "@/helpers/client/common";
import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { InsertQuestData } from "./types";
import { useDebouncedEffect } from "@/helpers/client/hooks";

export const GenerateCoverPhoto = ({
  active,
  description,
  setCoverPhoto,
  continueToNextStep,
}: {
  active: boolean;
  description: string;
  setCoverPhoto: (v: InsertQuestData["coverPhoto"]) => void;
  continueToNextStep: () => void;
}) => {
  const [generationStarted, setGenerationStarted] = useState(false);
  const [imageDataUrl, generating, setDescription] = useGeneratedCoverImage();
  const passGeneratedPhoto = useCallback(async () => {
    setGenerationStarted(false);
    if (imageDataUrl) {
      const image = await loadImageFromUrl(imageDataUrl);
      setCoverPhoto({
        url: imageDataUrl,
        alt: "cover_photo.png",
        width: image.width,
        height: image.height,
      });
    }
    setTimeout(() => {
      continueToNextStep();
    }, 500);
  }, [continueToNextStep, imageDataUrl, setCoverPhoto]);
  useDebouncedEffect(() => {
    if (!active) return;
    setGenerationStarted(true);
    setDescription(description);
  }, [active, description, setDescription]);
  useDebouncedEffect(() => {
    if (!active || !generationStarted || generating) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    passGeneratedPhoto();
  }, [active, generating, generationStarted, passGeneratedPhoto]);
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
