"use client";

import { useMemo } from "react";
import { ReadMore } from "@/components/read_more";
import { Timeline } from "@/components/timeline";

import { SafeUser } from "@/helpers/server/auth";

import {
  getReadLinkTimelineQueryKey,
  useReadLinkTimeline,
} from "@/apiHooks/link/readLinkTimeline";
import { useReactToLinkTimelineComment } from "@/apiHooks/link/reactToLinkTimelineComment";
import { LinkTimelineInput } from "./LinkTimelineInput";
import type { SocialMediaName } from "./ReflowTree";
import type { LinkTimelineReadResult, LinkTimelineReaction } from "../../types";
import { useQueryClient } from "@tanstack/react-query";

export type TimelineAction = React.ComponentProps<
  typeof Timeline
>["actions"][number];

const EMPTY_TIMELINE: LinkTimelineReadResult = { actions: [] };

export function LinkTimelineContent({
  linkCode,
  user,
  referer,
  questId,
}: {
  linkCode: string;
  user?: SafeUser;
  referer?: SocialMediaName;
  questId: string;
}) {
  const {
    data,
    isError: readHasError,
    error: readError,
  } = useReadLinkTimeline({ linkCode });
  const queryClient = useQueryClient();

  const update = useReactToLinkTimelineComment({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: getReadLinkTimelineQueryKey({ linkCode }),
      });
      const previousTimeline = queryClient.getQueryData<LinkTimelineReadResult>(
        getReadLinkTimelineQueryKey({ linkCode }),
      );

      queryClient.setQueryData<LinkTimelineReadResult>(
        getReadLinkTimelineQueryKey({ linkCode }),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            actions: oldData.actions.map((action) => {
              if (action.comment?.id !== variables.commentId) return action;
              const previousReaction = action.comment.viewerReaction;
              let likeCount = action.comment.likeCount;
              let dislikeCount = action.comment.dislikeCount;
              const hasReactionChanged =
                previousReaction !== variables.reaction;

              if (hasReactionChanged) {
                // Remove the old reaction (covers toggling off, e.g. dislike -> dislike) and apply the new one.
                if (previousReaction === "like")
                  likeCount = Math.max(0, likeCount - 1);
                if (previousReaction === "dislike")
                  dislikeCount = Math.max(0, dislikeCount - 1);

                if (variables.reaction === "like") likeCount += 1;
                if (variables.reaction === "dislike") dislikeCount += 1;
              }

              return {
                ...action,
                comment: {
                  ...action.comment,
                  viewerReaction: variables.reaction,
                  likeCount,
                  dislikeCount,
                },
              };
            }),
          };
        },
      );
      return { previousTimeline };
    },
    onError: (_error, _variables, context) => {
      const previousTimeline = (
        context as { previousTimeline?: LinkTimelineReadResult } | undefined
      )?.previousTimeline;
      if (previousTimeline) {
        queryClient.setQueryData<LinkTimelineReadResult>(
          getReadLinkTimelineQueryKey({ linkCode }),
          previousTimeline,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getReadLinkTimelineQueryKey({ linkCode }),
      });
    },
  });
  const resolvedReferer: SocialMediaName = referer ?? "unknown";

  const timelineData: LinkTimelineReadResult =
    data && typeof data !== "boolean" ? data : EMPTY_TIMELINE;
  const pendingReactionId = update.variables?.commentId ?? null;
  const timelineActions = useMemo<TimelineAction[]>(() => {
    const mapped: TimelineAction[] = [];
    for (const entry of timelineData.actions) {
      const timestamp = new Date(entry.timestamp);
      if (Number.isNaN(timestamp.valueOf())) {
        continue;
      }

      const isOptimisticEntry = entry.id.startsWith("optimistic-");

      const action: TimelineAction = {
        id: entry.id,
        type: entry.type,
        name: entry.name,
        imageUrl: entry.imageUrl ?? undefined,
        timestamp,
        description: entry.description ?? undefined,
        optimistic: isOptimisticEntry,
      };

      if (entry.comment) {
        action.comment = {
          id: entry.comment.id,
          content: entry.comment.content,
          likeCount: entry.comment.likeCount,
          dislikeCount: entry.comment.dislikeCount,
          viewerReaction: entry.comment.viewerReaction,
          optimistic: isOptimisticEntry,
          isPending: update.isPending && pendingReactionId === entry.comment.id,
          onReact: !!user
            ? (desired: LinkTimelineReaction | null) => {
                const nextReaction =
                  entry.comment?.viewerReaction === desired ? null : desired;
                update.mutate({
                  commentId: entry.comment!.id,
                  reaction: nextReaction,
                  referer: resolvedReferer,
                  linkCode,
                });
              }
            : undefined,
        };
      }
      mapped.unshift(action);
    }
    return mapped;
  }, [
    timelineData,
    pendingReactionId,
    update,
    resolvedReferer,
    user,
    linkCode,
  ]);

  return (
    <div className="">
      <LinkTimelineInput
        linkCode={linkCode}
        user={user}
        referer={referer}
        questId={questId}
      />
      <ReadMore
        maxHeight="11rem"
        className="card bg-base-100 rounded-t-none border-t-0 p-4 outline-0"
      >
        <Timeline actions={timelineActions} />
      </ReadMore>

      {readHasError && (
        <p className="text-warning mt-2 text-xs" role="status">
          {readError instanceof Error
            ? readError.message
            : "Unable to refresh timeline"}
        </p>
      )}
    </div>
  );
}
