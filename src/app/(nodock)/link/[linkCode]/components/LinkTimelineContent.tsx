"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { ReadMore } from "@/components/read_more";
import { Timeline } from "@/components/timeline";
import { Avatar } from "@/components/user_avatar";
import { SafeUser } from "@/helpers/server/auth";
import { Button } from "@/components/button";
import {
  getReadLinkTimelineQueryKey,
  useReadLinkTimeline,
} from "@/apiHooks/link/readLinkTimeline";
import { useAddLinkTimelineComment } from "@/apiHooks/link/addLinkTimelineComment";
import { useReactToLinkTimelineComment } from "@/apiHooks/link/reactToLinkTimelineComment";
import type { SocialMediaName } from "./ReflowTree";
import type { LinkTimelineReadResult, LinkTimelineReaction } from "../../types";
import { useQueryClient } from "@tanstack/react-query";
import { getLinkStatsCardQueryKey } from "@/apiHooks/link/linkStatsCard";

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
  const commentInputId = useId();
  const [commentText, setCommentText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // const mutationOptions = useLinkTimelineMutationOptions({ linkCode }, user);
  // const timelineQuery = useLinkTimeline({ linkCode }, mutationOptions);
  // const { data, create, update } = timelineQuery;

  const {
    data,
    isError: readHasError,
    error: readError,
  } = useReadLinkTimeline({ linkCode });
  const queryClient = useQueryClient();
  const create = useAddLinkTimelineComment({
    async onMutate(variables) {
      await queryClient.cancelQueries({
        queryKey: getReadLinkTimelineQueryKey({ linkCode }),
      });
      const previousTimeline = queryClient.getQueryData<LinkTimelineReadResult>(
        getReadLinkTimelineQueryKey({ linkCode }),
      );

      const optimisticId = `optimistic-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
      const optimisticName =
        user?.fullName?.trim() ||
        user?.firstName?.trim() ||
        user?.lastName?.trim() ||
        "You";

      const optimisticAction: LinkTimelineReadResult["actions"][number] = {
        id: optimisticId,
        type: "commented on the quest",
        name: optimisticName,
        imageUrl: user?.imageUrl,
        timestamp: new Date().toISOString(),
        description: variables.content,
        comment: {
          id: `${optimisticId}-comment`,
          content: variables.content,
          likeCount: 0,
          dislikeCount: 0,
          viewerReaction: null,
        },
      };

      queryClient.setQueryData<LinkTimelineReadResult>(
        getReadLinkTimelineQueryKey({ linkCode }),
        (oldData) => ({
          actions: [...(oldData?.actions ?? []), optimisticAction],
        }),
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
      queryClient.invalidateQueries({
        queryKey: getLinkStatsCardQueryKey({ questId }),
      });
    },
  });
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

              if (previousReaction === "like")
                likeCount = Math.max(0, likeCount - 1);
              if (previousReaction === "dislike")
                dislikeCount = Math.max(0, dislikeCount - 1);

              if (variables.reaction === "like") likeCount += 1;
              if (variables.reaction === "dislike") dislikeCount += 1;

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const trimmed = commentText.trim();
    if (!trimmed) {
      setFormError("Please enter a comment before posting.");
      return;
    }
    setFormError(null);
    try {
      await create.mutateAsync({
        content: trimmed,
        referer: resolvedReferer,
        linkCode,
      });
      setCommentText("");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to post comment",
      );
    }
  };

  const placeholder = user ? "Share your thoughts …" : "Sign in to comment";

  const commentDisabled = create.isPending || !user;

  return (
    <div className="">
      <form
        className="card bg-base-100/80 rounded-b-none border border-b-0 border-neutral-400 p-2 shadow-xs transition"
        onSubmit={handleSubmit}
      >
        <div className="bg-base-200/50 focus-within:bg-base-300/60 flex items-center gap-1 rounded shadow-inner transition-all">
          {user?.imageUrl && (
            <div className="shrink-0">
              <Avatar
                name="You"
                className="w-10 bg-transparent"
                imageUrl={user.imageUrl}
              />
            </div>
          )}
          <div className="flex flex-1 items-center gap-1 pr-1">
            <input
              id={commentInputId}
              type="text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={placeholder}
              disabled={commentDisabled}
              className="input input-bordered input-sm bg-base-100 placeholder:text-base-content/60 flex-1 text-sm"
            />
            <Button
              type="submit"
              buttonType="primary"
              buttonSize="sm"
              disabled={commentDisabled || commentText.trim().length === 0}
            >
              {"Post"}
            </Button>
          </div>
        </div>
        {formError && (
          <p className="text-error mt-2 text-sm" role="alert">
            {formError}
          </p>
        )}
        {!formError && create.isError && (
          <p className="text-error mt-2 text-sm" role="alert">
            {create.error instanceof Error
              ? create.error.message
              : "Failed to post comment"}
          </p>
        )}
      </form>
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
