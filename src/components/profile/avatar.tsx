"use client";
import { ReactNode, useMemo } from "react";
import { LoadingElement } from "@/components/loading";
import Image from "next/image";
import { cn } from "@/helpers/client/tailwind_helpers";

function AvatarContainer({
  children,
  size,
  className,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`bg-neutral text-neutral-content grid place-items-center rounded-full font-medium shadow ${className}`}
      style={{ width: size, height: size }}
      aria-label="No profile picture"
    >
      {children}
    </div>
  );
}

/**
 * AvatarPreview — shows a circular preview of the current image (if any) or initials fallback.
 */
export function AvatarPreview({
  src,
  name,
  size = 144, // 36 * 4
  className = "",
  loadingImage,
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  loadingImage?: boolean;
}) {
  const initials = useMemo(() => {
    const n = (name || "?").trim();
    if (!n) return "?";
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  }, [name]);
  if (loadingImage) {
    return (
      <AvatarContainer size={size} className={className}>
        <LoadingElement />
      </AvatarContainer>
    );
  }
  if (src) {
    return (
      <Image
        src={src}
        alt="Profile picture"
        width={size}
        height={size}
        className={cn("rounded-full object-cover shadow", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <AvatarContainer size={size} className={className}>
      {initials}
    </AvatarContainer>
  );
}
