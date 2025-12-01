export const timeout = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getImageDataUrl = (image: HTMLImageElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context)
    throw Error("getImageDataUrl: Error getting 2d context for the canvas");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
};

export const loadImageFromUrl = (src: string): Promise<HTMLImageElement> => {
  if (typeof Image === "undefined") throw "Image constructor is not supported";
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
  if (typeof FileReader === "undefined") throw "FileReader is not supported";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const loadBlobFromUrl = async (src: string): Promise<Blob> => {
  const result = await fetch(src, { mode: "cors", credentials: "omit" });
  return await result.blob();
};

export const loadFileFromUrl = async (
  src: string,
  fileName: string,
  mimeType?: string,
): Promise<File> => {
  const blob = await loadBlobFromUrl(src);
  return new File([blob], fileName, {
    type:
      blob.type === ""
        ? mimeType
          ? mimeType
          : "application/octet-stream"
        : blob.type,
  });
};
