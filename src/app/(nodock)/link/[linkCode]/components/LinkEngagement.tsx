"use client";

import type { ReactNode } from "react";
import { AvatarGroup, type UserAvatarProps } from "@/components/user_avatar";
import { Button } from "@/components/button";
import { ReflowIcon } from "@/components/icons/reflow";
import { BulbIcon } from "@/components/icons/bulb";
import { BookmarkIcon } from "@/components/icons/bookmark";
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

export function LinkEngagement({
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
