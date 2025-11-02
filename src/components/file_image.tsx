/* eslint-disable @next/next/no-img-element */
import { cn } from "@/helpers/client/tailwind_helpers";
import { useEffect, useState } from "react";

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
  const [srcUrl, setSrcUrl] = useState("");
  useEffect(() => {
    if (!src) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrcUrl(URL.createObjectURL(src));
    return () => URL.revokeObjectURL(srcUrl);
  }, [src]);
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
