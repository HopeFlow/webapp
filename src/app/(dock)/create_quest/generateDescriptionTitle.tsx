import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { useGenerateDescriptionTitle } from "@/helpers/client/LLM";
import { SafeUser } from "@/helpers/server/auth";
import type { QuestIntentState } from "@/helpers/server/LLM";
import { useEffect, useState } from "react";
import type { InsertQuestData } from "./types";
import { loadBlobFromUrl, loadImageFromUrl } from "@/helpers/client/common";

type SetCoverPhotoAction = (
  v: InsertQuestData["coverPhoto"],
) => InsertQuestData["coverPhoto"];

export const GenerateDescriptionTitle = ({
  user,
  questIntentState,
  setTitle,
  setShareTitle,
  setDescription,
  setCoverPhoto,
  setIsCoverPhotoGenerating,
  coverPhotoExists,
  active,
  continueToNextStep,
}: {
  user: SafeUser;
  questIntentState: QuestIntentState | null;
  setTitle: (v: string) => void;
  setShareTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setCoverPhoto: (v: InsertQuestData["coverPhoto"] | undefined) => void;
  setIsCoverPhotoGenerating: (v: boolean) => void;
  coverPhotoExists: boolean;
  active: boolean;
  continueToNextStep: () => void;
}) => {
  const [generationStarted, setGenerationStarted] = useState(false);
  const {
    imageDataUrl,
    generating,
    setDescription: setCoverImageDescription,
  } = useGeneratedCoverImage();
  const { descriptionTitle, thinking, thinkingMessage, setQuestIntentState } =
    useGenerateDescriptionTitle(user.firstName ?? "User");
  useEffect(() => {
    setIsCoverPhotoGenerating(generating);
    if (!coverPhotoExists && imageDataUrl) {
      (async () => {
        const image = await loadImageFromUrl(imageDataUrl);
        const file = new File(
          [await loadBlobFromUrl(imageDataUrl)],
          "cover_photo.png",
          { type: "image/png" },
        );
        setCoverPhoto({
          content: file,
          alt: "cover_photo.png",
          width: image.width,
          height: image.height,
        });
      })();
    }
  }, [
    coverPhotoExists,
    generating,
    imageDataUrl,
    setCoverPhoto,
    setIsCoverPhotoGenerating,
  ]);
  useEffect(() => {
    if (!active) return;
    Promise.resolve().then(() => {
      setGenerationStarted(true);
      setQuestIntentState(questIntentState);
    });
  }, [active, questIntentState, setQuestIntentState]);
  useEffect(() => {
    if (!active || !generationStarted || thinking) return;
    Promise.resolve().then(() => {
      setGenerationStarted(false);
      setTitle(descriptionTitle.seekerTitle);
      setShareTitle(descriptionTitle.contributorTitle);
      setDescription(descriptionTitle.description);
      if (!coverPhotoExists) {
        setCoverImageDescription(descriptionTitle.description);
      }
      continueToNextStep();
    });
  }, [
    active,
    continueToNextStep,
    coverPhotoExists,
    descriptionTitle,
    generationStarted,
    setCoverImageDescription,
    setDescription,
    setShareTitle,
    setTitle,
    thinking,
  ]);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      {thinking && (
        <div className="flex items-center justify-center p-4">
          <span className="loading loading-bars loading-xl"></span>
          <span className="inline-block w-3"></span>
          {thinkingMessage}
        </div>
      )}
    </div>
  );
};
