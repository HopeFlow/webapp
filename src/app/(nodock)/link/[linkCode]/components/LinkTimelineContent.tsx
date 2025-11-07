"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { ReadMore } from "@/components/read_more";
import { Timeline } from "@/components/timeline";
import { Avatar } from "@/components/user_avatar";
import { SafeUser } from "@/helpers/server/auth";
import { Button } from "@/components/button";
import { useLinkTimeline } from "@/server_actions/client/link/linkTimeline";
import type {
  LinkTimelineReadResult,
  LinkTimelineReaction,
} from "@/server_actions/definitions/link/types";

export type TimelineAction = React.ComponentProps<
  typeof Timeline
>["actions"][number];

const EMPTY_TIMELINE: LinkTimelineReadResult = {
  actions: [],
  viewer: { canComment: false, canReact: false },
};

export function LinkTimelineContent({
  linkCode,
  user,
}: {
  linkCode: string;
  user?: SafeUser;
}) {
  const commentInputId = useId();
  const [commentText, setCommentText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const timelineQuery = useLinkTimeline({ linkCode });
  const { data, create, update } = timelineQuery;

  const timelineData: LinkTimelineReadResult =
    data && typeof data !== "boolean" ? data : EMPTY_TIMELINE;
  const pendingReactionId = update.variables?.commentId ?? null;
  const canComment = Boolean(user) && timelineData.viewer.canComment;
  const canReact = Boolean(user) && timelineData.viewer.canReact;

  const timelineActions = useMemo<TimelineAction[]>(() => {
    const mapped: TimelineAction[] = [];
    for (const entry of timelineData.actions) {
      const timestamp = new Date(entry.timestamp);
      if (Number.isNaN(timestamp.valueOf())) {
        continue;
      }

      const action: TimelineAction = {
        id: entry.id,
        type: entry.type,
        name: entry.name,
        imageUrl: entry.imageUrl ?? undefined,
        timestamp,
        description: entry.description ?? undefined,
      };

      if (entry.comment) {
        action.comment = {
          id: entry.comment.id,
          content: entry.comment.content,
          likeCount: entry.comment.likeCount,
          dislikeCount: entry.comment.dislikeCount,
          viewerReaction: entry.comment.viewerReaction,
          isPending: update.isPending && pendingReactionId === entry.comment.id,
          onReact: canReact
            ? (desired: LinkTimelineReaction | null) => {
                const nextReaction =
                  entry.comment?.viewerReaction === desired ? null : desired;
                update.mutate({
                  commentId: entry.comment!.id,
                  reaction: nextReaction,
                });
              }
            : undefined,
        };
      }

      mapped.unshift(action); // unshift to put comments at the top
    }
    return mapped;
  }, [timelineData.actions, pendingReactionId, canReact, update]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canComment) return;
    const trimmed = commentText.trim();
    if (!trimmed) {
      setFormError("Please enter a comment before posting.");
      return;
    }
    setFormError(null);
    try {
      await create.mutateAsync({ content: trimmed });
      setCommentText("");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to post comment",
      );
    }
  };

  const placeholder = user
    ? canComment
      ? "Share your thoughts…"
      : "Join the quest to comment"
    : "Sign in to comment";

  const commentDisabled = !canComment || create.isPending;

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
              {user ? "Post" : "Sign in and Post"}
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

      {timelineQuery.error && (
        <p className="text-warning mt-2 text-xs" role="status">
          {timelineQuery.error instanceof Error
            ? timelineQuery.error.message
            : "Unable to refresh timeline"}
        </p>
      )}
    </div>
  );
}
