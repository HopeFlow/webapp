/* eslint-disable @next/next/no-img-element */
import { cn } from "@/helpers/client/tailwind_helpers";
import { useEffect, useMemo } from "react";

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: File;
};

export function FileImage({
  src,
  alt,
  width,
  height,
  className,
  ...props
}: ImageProps) {
  const srcUrl = useMemo(() => src && URL.createObjectURL(src), [src]);
  useEffect(() => {
    if (!srcUrl) return;
    return () => {
      URL.revokeObjectURL(srcUrl);
    };
  }, [src, srcUrl]);
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
