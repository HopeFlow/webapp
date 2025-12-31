"use client";

import { useId, useState, type FormEvent, useCallback } from "react";
import { Avatar } from "@/components/user_avatar";
import { SafeUser } from "@/helpers/server/auth";
import { Button } from "@/components/button";
import { getReadLinkTimelineQueryKey } from "@/apiHooks/link/readLinkTimeline";
import { useAddLinkTimelineComment } from "@/apiHooks/link/addLinkTimelineComment";
import type { SocialMediaName } from "./ReflowTree";
import type { LinkTimelineReadResult } from "../../types";
import { useQueryClient } from "@tanstack/react-query";
import { getLinkStatsCardQueryKey } from "@/apiHooks/link/linkStatsCard";
import { useDeferredAction } from "@/app/deferred_action_context";
import { useEffect } from "react";

export function LinkTimelineInput({
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
    onError: (error, _variables, context) => {
      const previousTimeline = (
        context as { previousTimeline?: LinkTimelineReadResult } | undefined
      )?.previousTimeline;
      if (previousTimeline) {
        queryClient.setQueryData<LinkTimelineReadResult>(
          getReadLinkTimelineQueryKey({ linkCode }),
          previousTimeline,
        );
      }
      setFormError(
        error instanceof Error ? error.message : "Failed to post comment",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getReadLinkTimelineQueryKey({ linkCode }),
      });
      queryClient.invalidateQueries({
        queryKey: getLinkStatsCardQueryKey({ questId, linkCode }),
      });
    },
    onSuccess: () => {
      setCommentText("");
      setFormError(null);
    },
  });

  const resolvedReferer: SocialMediaName = referer ?? "unknown";
  const { defer, consume } = useDeferredAction("comment");

  const handleMutation = useCallback(
    (content: string) => {
      setFormError(null);
      create.mutate({ content, referer: resolvedReferer, linkCode });
    },
    [create, resolvedReferer, linkCode],
  );

  useEffect(() => {
    const pendingComment = consume<string>();
    if (pendingComment && user) {
      create.mutate({
        content: pendingComment,
        referer: resolvedReferer,
        linkCode,
      });
    }
  }, [consume, user, create, resolvedReferer, linkCode]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmed = commentText.trim();
    if (!trimmed) {
      setFormError("Please enter a comment before posting.");
      return;
    }
    if (!user) {
      if (trimmed) {
        defer(trimmed);
      }
      return;
    }
    handleMutation(trimmed);
  };

  const placeholder = "Share your thoughts …";

  const commentDisabled = create.isPending;

  return (
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
  );
}
