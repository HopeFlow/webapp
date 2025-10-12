import { useEffect, useState } from "react";
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

export const useGeneratedCoverImage = (title: string) => {
  const [imageDataUrl, setImageDataUrl] = useState<string>();
  useEffect(() => {
    if (!title || title.trim() === "") return;
    const throttledCallTimeout = setTimeout(async () => {
      const imageData = await getGenAIResponse(
        getGeneratedCoverImagePrompt(title),
      );
      // if (imageData) setImageData(imageData);
      // return;
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
    }, 4000);
    return () => {
      clearTimeout(throttledCallTimeout);
    };
  }, [title]);
  return imageDataUrl;
};
