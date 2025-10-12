export const timeout = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const loadImageFromUrl = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
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
  const res = await fetch(src, { mode: "cors", credentials: "omit" });
  return await res.blob();
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
