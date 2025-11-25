import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { getLinkTimelineQueryKey } from "@/server_actions/client/link/linkTimeline";
import type { SafeUser } from "@/helpers/server/auth";
import type {
  LinkTimelineReadResult,
  LinkTimelineRecord,
  LinkTimelineCreateInput,
  LinkTimelineReactionInput,
} from "@/server_actions/definitions/link/types";

const toTimelineData = (
  data: LinkTimelineReadResult | boolean | undefined,
): LinkTimelineReadResult => {
  if (data && typeof data === "object") {
    return data;
  }
  return { actions: [] };
};

const buildOptimisticCommentRecord = (
  content: string,
  user?: SafeUser,
): LinkTimelineRecord & {
  optimistic?: boolean;
  comment?: LinkTimelineRecord["comment"] & { optimistic?: boolean };
} => {
  const name =
    user?.fullName?.trim() ||
    user?.firstName?.trim() ||
    user?.lastName?.trim() ||
    "You";
  const timestamp = new Date().toISOString();
  const temporaryId =
    typeof crypto.randomUUID === "function"
      ? `optimistic-${crypto.randomUUID()}`
      : `optimistic-${Date.now()}`;

  return {
    id: temporaryId,
    type: "commented on the quest",
    name,
    imageUrl: user?.imageUrl ?? null,
    timestamp,
    description: content,
    comment: {
      id: temporaryId,
      content,
      likeCount: 0,
      dislikeCount: 0,
      viewerReaction: null,
      optimistic: true,
    },
    optimistic: true,
  };
};

export const useLinkTimelineMutationOptions = (
  linkCode: string,
  user?: SafeUser,
) => {
  const queryClient = useQueryClient();
  const queryKey = getLinkTimelineQueryKey({ linkCode });

  type MutationContext = {
    previousData: LinkTimelineReadResult | boolean | undefined;
  };

  return {
    create: {
      onMutate: async (variables: LinkTimelineCreateInput) => {
        const previous = queryClient.getQueryData<
          LinkTimelineReadResult | boolean
        >(queryKey);
        const safePrevious = toTimelineData(previous);
        const optimisticRecord = buildOptimisticCommentRecord(
          variables.content,
          user,
        );

        queryClient.setQueryData<LinkTimelineReadResult>(queryKey, {
          actions: [...safePrevious.actions, optimisticRecord],
        });

        return {
          previousData:
            previous && typeof previous === "object" ? previous : undefined,
        };
      },
      onError: (
        _error: Error,
        _vars: LinkTimelineCreateInput,
        context: MutationContext | undefined,
      ) => {
        if (context?.previousData) {
          queryClient.setQueryData(queryKey, context.previousData);
        }
      },
    } as UseMutationOptions<
      boolean,
      Error,
      LinkTimelineCreateInput,
      MutationContext
    >,
    update: {
      onMutate: async (variables: LinkTimelineReactionInput) => {
        const previous = queryClient.getQueryData<
          LinkTimelineReadResult | boolean
        >(queryKey);
        if (!previous || typeof previous !== "object") {
          return { previousData: undefined };
        }

        const nextActions = previous.actions.map((action) => {
          if (!action.comment || action.comment.id !== variables.commentId) {
            return action;
          }

          const currentReaction = action.comment.viewerReaction;
          let likeCount = action.comment.likeCount;
          let dislikeCount = action.comment.dislikeCount;

          if (currentReaction === "like")
            likeCount = Math.max(0, likeCount - 1);
          if (currentReaction === "dislike")
            dislikeCount = Math.max(0, dislikeCount - 1);

          if (variables.reaction === "like") likeCount += 1;
          if (variables.reaction === "dislike") dislikeCount += 1;

          const existingComment = action.comment as
            | (typeof action.comment & { optimistic?: boolean })
            | null
            | undefined;
          return {
            ...action,
            comment: {
              ...existingComment,
              likeCount,
              dislikeCount,
              viewerReaction: variables.reaction,
              optimistic: existingComment?.optimistic,
            },
          };
        });

        queryClient.setQueryData(queryKey, {
          ...previous,
          actions: nextActions,
        });

        return { previousData: previous };
      },
      onError: (
        _error: Error,
        _vars: LinkTimelineReactionInput,
        context: MutationContext | undefined,
      ) => {
        if (context?.previousData) {
          queryClient.setQueryData(queryKey, context.previousData);
        }
      },
    } as UseMutationOptions<
      boolean,
      Error,
      LinkTimelineReactionInput,
      MutationContext
    >,
  };
};
