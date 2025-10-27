import { loadImageFromUrl } from "@/helpers/client/common";
import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type { InsertQuestData } from "./types";

export const GenerateCoverPhoto = ({
  active,
  description,
  setCoverPhoto,
  continueToNextStep,
}: {
  active: boolean;
  description: string;
  setCoverPhoto: Dispatch<
    SetStateAction<InsertQuestData["coverPhoto"] | undefined>
  >;
  continueToNextStep: () => void;
}) => {
  const [generationStarted, setGenerationStarted] = useState(false);
  const [imageDataUrl, generating, setDescription] = useGeneratedCoverImage();
  useEffect(() => {
    console.log({ active });
    if (!active) return;
    Promise.resolve().then(() => {
      console.log({ f: "useEffectGenAI::active", description });
      setGenerationStarted(true);
      setDescription(description);
    });
  }, [active, description, setDescription]);
  useEffect(() => {
    console.log({ active, generationStarted, generating });
    if (!active || !generationStarted || generating) return;
    (async () => {
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
      continueToNextStep();
    })();
  }, [
    active,
    continueToNextStep,
    generating,
    generationStarted,
    imageDataUrl,
    setCoverPhoto,
  ]);
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
