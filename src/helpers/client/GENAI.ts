import { useCallback, useEffect, useState } from "react";
import { generateCoverPhoto } from "../server/GENAI";
import { loadImageFromUrl } from "./common";

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
        const imageData = await generateCoverPhoto(description);
        if (imageData && canvas && canvasContext) {
          const unprocessedImage = await loadImageFromUrl(
            `data:image/jpeg;base64,${imageData}`,
          );
          const scale = Math.min(
            unprocessedImage.width / canvas.width,
            unprocessedImage.height / canvas.height,
          );
          canvasContext.clearRect(0, 0, canvas.width, canvas.height);
          const sx = (unprocessedImage.width - canvas.width * scale) / 2;
          const sy = (unprocessedImage.height - canvas.height * scale) / 2;
          canvasContext.drawImage(
            unprocessedImage,
            sx,
            sy,
            canvas.width * scale,
            canvas.height * scale,
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const resizedImageDataUrl = canvas.toDataURL("image/png");
          setImageDataUrl(resizedImageDataUrl);
        } else if (imageData)
          setImageDataUrl(`data:image/png;base64,${imageData}`);
      } catch (e) {
        console.error({ error: e });
      } finally {
        setGenerating(false);
      }
    })();
  }, [description, generating]);
  return { imageDataUrl, generating, setDescription };
};
