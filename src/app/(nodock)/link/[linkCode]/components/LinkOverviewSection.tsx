"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { MediaCarousel } from "@/components/media_carousel";
import { AvatarGroup, type UserAvatarProps } from "@/components/user_avatar";
import { Button } from "@/components/button";
import { ReflowIcon } from "@/components/icons/reflow";
import { BulbIcon } from "@/components/icons/bulb";
import { BookmarkIcon } from "@/components/icons/bookmark";
import { EyeIcon } from "@/components/icons/eye";
import { MediatorsIcon } from "@/components/icons/mediators";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";
import { ReflowModal, showReflowModal } from "@/modals/reflow_modal";
import {
  SubmitAnswerModal,
  showSubmitAnswerModal,
} from "@/modals/submit_answer_modal";

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

export function LinkOverviewMedia({
  mediaItems,
  status,
}: {
  mediaItems: LinkOverviewMediaItem[];
  status: LinkStatusInfo;
}) {
  return (
    <div className="flex flex-col gap-4 md:w-2/3">
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
      <StatusCard status={status} />
    </div>
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

const StatusCard = ({ status }: { status: LinkStatusInfo }) => {
  const stats = status.stats ?? [];

  if (!stats.length) {
    return null;
  }

  return (
    <section className="rounded-box border-base-200 bg-base-100/70 text-base-content border text-xs shadow-sm backdrop-blur">
      <div className="divide-base-200 flex flex-wrap divide-y md:flex-nowrap md:divide-x md:divide-y-0">
        {stats.map((stat) => (
          <article
            key={stat.id}
            className="flex min-w-[120px] flex-1 items-center gap-2 p-3"
            title={stat.helper}
            aria-label={
              stat.helper ? `${stat.label}: ${stat.helper}` : stat.label
            }
          >
            <div className="bg-base-200/80 text-primary rounded-lg p-2 shadow-inner">
              {iconForStat(stat.icon)}
            </div>
            <div className="flex flex-col">
              <span className="text-base-content/60 text-[0.6rem] font-semibold tracking-wide uppercase">
                {stat.label}
              </span>
              <span className="text-base leading-tight font-bold">
                {stat.value}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  /*
  const style = {
    "--branch-color": status.branchColor,
    "--leaf-color": status.leafColor,
  } as CSSProperties;

  return (
    <div className="rounded-box bg-base-300 flex flex-row items-center gap-4 p-4 text-sm md:flex-row md:text-lg">
      <div>
        <b className="text-amber-700">{status.stage} </b>
        <div
          className="inline-flex flex-row items-center justify-center align-middle"
          style={style}
        >
          <Leaf className="h-4 md:h-6" />
        </div>
      </div>
      <p>
        <b>Expires</b> if <span className="inline md:hidden">dormant</span>
        <span className="hidden md:inline">
          gets <i>no contribution</i>
        </span>
        <span className="inline md:hidden"> for </span>
        <span className="hidden md:inline"> in next </span>
        <b>{status.expiresInDays} days</b>
      </p>
    </div>
  );
  */
};

const iconForStat = (icon: LinkStatusStatIcon) => {
  const common = "h-5 w-5";

  switch (icon) {
    case "views":
      return <EyeIcon className={common} />;
    case "shares":
      return <MediatorsIcon className={common} />;
    case "leads":
      return <BulbIcon className={common} />;
    case "comments":
      return <ChatBubbleIcon className={common} />;
    default:
      return null;
  }
};

export function LinkOverviewEngagement({
  inviter,
  submitQuestions,
  actionLabels,
}: {
  inviter: LinkInviterInfo;
  submitQuestions: LinkSubmitQuestion[];
  actionLabels: LinkActionLabels;
}) {
  const hasMultipleInviters = (inviter.avatars?.length ?? 0) > 1;
  const inviterRowClassName = [
    "flex-shink-0 flex flex-grow-0 flex-row items-center gap-2 select-none",
    hasMultipleInviters
      ? "hover:[&>.avatar-group]:space-x-2 active:[&>.avatar-group]:space-x-2 hover:[&>.avatar-group-desc]:opacity-0 active:[&>.avatar-group-desc]:opacity-0"
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="card bg-info text-info-content flex flex-1 flex-col gap-4 p-2 font-light md:p-4">
      <div className="flex flex-col items-start gap-4 p-2 md:flex md:p-0">
        <div className={inviterRowClassName}>
          <AvatarGroup
            className="[&_*]:select-none [&>.avatar]:transition-all [&>.avatar]:duration-1000"
            userAvatarProps={inviter.avatars}
          />
          <p className="avatar-group-desc max-h-[2lh] flex-1 basis-0 overflow-hidden opacity-1000 transition-opacity duration-1500">
            {inviter.message}
          </p>
        </div>
        <p>{inviter.description}</p>
      </div>
      <div className="hidden flex-1 md:block" />
      <div className="flex flex-col justify-between gap-4 font-normal">
        <Button buttonType="primary" onClick={() => showReflowModal()}>
          <ReflowIcon size={18} /> {actionLabels.reflow}
        </Button>
        <ReflowModal />
        <div className="flex w-full flex-row items-stretch justify-between gap-2">
          <Button
            buttonType="secondary"
            className="flex-1"
            onClick={() => {
              showSubmitAnswerModal();
            }}
          >
            <BulbIcon size={18} /> {actionLabels.submit}
          </Button>
          <SubmitAnswerModal questions={submitQuestions} />
          <Button buttonType="neutral" buttonStyle="soft" className="flex-1">
            <BookmarkIcon size={18} />
            {actionLabels.bookmark}
          </Button>
        </div>
      </div>
    </div>
  );
}
