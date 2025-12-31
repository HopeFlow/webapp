"use client";

import Image from "next/image";
import { Button } from "@/components/button";
import { formatDateWithSuffix } from "@/helpers/client/time";
import { useGotoChat } from "@/helpers/client/routes";
import { useDeferredAction } from "@/app/deferred_action_context";
import { useEffect } from "react";
import type { SafeUser } from "@/helpers/server/auth";

export function LinkFooterSection({
  name,
  avatarSrc,
  date,
  questId,
  nodeId,
  user,
}: {
  name: string;
  avatarSrc: string;
  date: Date;
  questId: string;
  nodeId?: string;
  user?: SafeUser;
}) {
  const gotoChat = useGotoChat();
  const { defer, consume } = useDeferredAction("ask_question");

  useEffect(() => {
    if (consume() && user && nodeId) {
      gotoChat({ questId, nodeId });
    }
  }, [consume, user, nodeId, questId, gotoChat]);
  return (
    <div className="card bg-base-300 text-base-content flex flex-1 flex-col items-start justify-start gap-4 p-4 md:flex-row md:items-center">
      <div className="flex flex-row gap-2">
        <div className="avatar inline-block">
          <div className="w-8 rounded-full">
            <Image
              src={avatarSrc}
              width={32}
              height={32}
              alt={name}
              className="h-auto max-w-full object-contain"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <span>{`${name} started this quest`}</span>
          <i>on {formatDateWithSuffix(date)}</i>
        </div>
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {`Do you have questions?`}
        <Button
          disabled={!nodeId}
          onClick={() => {
            if (nodeId) {
              if (!user) {
                defer();
              } else {
                gotoChat({ questId, nodeId });
              }
            }
          }}
          buttonType="base"
          buttonStyle="outline"
        >
          {"Send a message directly"}
        </Button>
      </div>
    </div>
  );
}
