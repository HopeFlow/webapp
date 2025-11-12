"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { MediaCarousel } from "@/components/media_carousel";
import { type UserAvatarProps } from "@/components/user_avatar";

export type LinkOverviewMediaItem = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  type?: "image" | "video";
};

export type LinkStatusStatIcon = "views" | "shares" | "leads" | "comments";

export type LinkStatusStat = {
  id: string;
  icon: LinkStatusStatIcon;
  label: string;
  value: string;
  helper?: string;
};

export type LinkStatusInfo = {
  stage: string;
  branchColor: string;
  leafColor: string;
  expiresInDays: number;
  stats: LinkStatusStat[];
};

export type LinkInviterInfo = {
  avatars: UserAvatarProps[];
  message: ReactNode;
  description: string;
};

export type LinkSubmitQuestion = { question: string; answerRequired: boolean };

export type LinkActionLabels = {
  reflow: string;
  submit: string;
  bookmark: string;
};

export function LinkMediaCarousel({
  mediaItems,
}: {
  mediaItems: LinkOverviewMediaItem[];
}) {
  return (
    <MediaCarousel className="outline-base-content outline-2">
      {mediaItems.map(({ id, src, width, height, alt, className, type }) => {
        const videoId = getYouTubeVideoId(src);
        const inferredType = type ?? (videoId ? "video" : "image");

        if (inferredType === "video" && videoId) {
          const aspectRatio =
            width > 0 && height > 0 ? `${width} / ${height}` : "16 / 9";
          const videoClassName = ["h-full w-full", className ?? "rounded-box"]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={id} className="w-full" style={{ aspectRatio }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={alt}
                className={videoClassName}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          );
        }

        return (
          <Image
            key={id}
            src={src}
            width={width}
            height={height}
            alt={alt}
            className={className}
          />
        );
      })}
    </MediaCarousel>
  );
}

const getYouTubeVideoId = (source: string) => {
  try {
    const url = new URL(source);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      if (url.pathname.startsWith("/watch")) {
        return url.searchParams.get("v");
      }

      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.replace("/embed/", "").split("/")[0] || null;
      }

      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.replace("/shorts/", "").split("/")[0] || null;
      }
    }
  } catch {
    //
  }

  return null;
};
