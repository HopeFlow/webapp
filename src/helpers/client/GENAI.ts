import { useCallback, useEffect, useState } from "react";
import { getGenAIResponse } from "../server/GENAI";
import { loadImageFromUrl } from "./common";

const getGeneratedCoverImagePrompt = (title: string) => `
Create a cover image for a ‘${title}’
IMPORTANT CONSTRAINTS:
1-No text, logos, or UI elements — just the art.
2-Only use center 1024x576 area of 1024x1024 canvas
IMAGE DESCRIPTION:
The image should be minimal. Creative design of a graphistic. With a dark background,
suitable for display on a light themed UI. The focus should be clear and centered, with
balanced negative space around the subject.
`;

const canvas =
  typeof document !== "undefined" && document.createElement("canvas");
if (canvas) {
  canvas.width = 1024;
  canvas.height = 576;
}
const canvasContext = canvas && canvas.getContext("2d");

export const useGeneratedCoverImage = () => {
  const [description, setDescriptionInternal] = useState<string>();
  const [generating, setGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>();
  const setDescription = useCallback(
    (newDescription: string) => {
      if (generating) return;
      if (description === newDescription) {
        setImageDataUrl((urlCopy) => {
          setTimeout(() => setImageDataUrl(urlCopy), 250);
          return undefined;
        });
      } else {
        setGenerating(true);
        setDescriptionInternal(newDescription);
      }
    },
    [description, generating],
  );
  useEffect(() => {
    if (!generating || !description) return;
    (async () => {
      try {
        const imageData = await getGenAIResponse(
          getGeneratedCoverImagePrompt(description),
        );
        if (imageData && canvas && canvasContext) {
          const squareImage = await loadImageFromUrl(
            `data:image/png;base64,${imageData}`,
          );
          canvasContext.drawImage(
            squareImage,
            0,
            224,
            1024,
            576,
            0,
            0,
            1024,
            576,
          );
          const resizedImageDataUrl = canvas.toDataURL("image/png");
          setImageDataUrl(resizedImageDataUrl);
        } else if (imageData)
          setImageDataUrl(`data:image/png;base64,${imageData}`);
      } finally {
        setGenerating(false);
      }
    })();
  }, [description, generating]);
  return [imageDataUrl, generating, setDescription] as const;
};
