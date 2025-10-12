import { cn } from "@/helpers/client/tailwind_helpers";
import { useEffect, useMemo, useState } from "react";

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: File;
};

let prevSource: File | undefined = undefined;

export function FileImage({
  src,
  alt,
  width,
  height,
  className,
  ...props
}: ImageProps) {
  const [srcUrl, setSrcUrl] = useState("");
  const prev = prevSource;
  useEffect(() => {
    if (!src) return;
    prevSource = src;
    const objectUrl = src && URL.createObjectURL(src);
    if (alt !== "Edit Photo")
      console.log("FileImage setting srcUrl", { srcUrl: objectUrl });
    setSrcUrl(objectUrl);
    return () => {
      if (alt !== "Edit Photo")
        console.log("FileImage revoking srcUrl", { srcUrl: objectUrl });
      URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  if (alt !== "Edit Photo")
    console.log("FileImage render", { prev, src, same: prev === src, srcUrl });
  return srcUrl === "" ? (
    <div
      className={cn(
        "bg-neutral text-neutral-content flex items-center justify-center",
        className,
      )}
      style={{ width, height }}
    >
      {alt}
    </div>
  ) : (
    <img
      key={srcUrl}
      src={srcUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      {...props}
    />
  );
}
