import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { getLinkTimelineQueryKey } from "@/server_actions/client/link/linkTimeline";
import type { SafeUser } from "@/helpers/server/auth";
import type {
  LinkTimelineCreateInput,
  LinkTimelineReactionInput,
  LinkTimelineReadParams,
  LinkTimelineReadResult,
  LinkTimelineRecord,
} from "@/server_actions/definitions/link/types";

type MutationContext = { previousData?: LinkTimelineReadResult };

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

const rollbackOptimisticData = (
  queryClient: QueryClient,
  queryKey: ReturnType<typeof getLinkTimelineQueryKey>,
  context?: MutationContext,
) => {
  if (!context) return;
  queryClient.setQueryData(queryKey, context.previousData);
};

const applyOptimisticComment = ({
  queryClient,
  queryKey,
  variables,
  user,
}: {
  queryClient: QueryClient;
  queryKey: ReturnType<typeof getLinkTimelineQueryKey>;
  variables: LinkTimelineCreateInput;
  user?: SafeUser;
}): MutationContext => {
  const previous = queryClient.getQueryData<LinkTimelineReadResult | boolean>(
    queryKey,
  );
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
};

const applyOptimisticReaction = ({
  queryClient,
  queryKey,
  variables,
}: {
  queryClient: QueryClient;
  queryKey: ReturnType<typeof getLinkTimelineQueryKey>;
  variables: LinkTimelineReactionInput;
}): MutationContext => {
  const previous = queryClient.getQueryData<LinkTimelineReadResult | boolean>(
    queryKey,
  );
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

    if (currentReaction === "like") likeCount = Math.max(0, likeCount - 1);
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

  queryClient.setQueryData(queryKey, { ...previous, actions: nextActions });

  return { previousData: previous };
};

export const useLinkTimelineMutationOptions = (
  params: LinkTimelineReadParams,
  user?: SafeUser,
) => {
  const queryClient = useQueryClient();
  const queryKey = getLinkTimelineQueryKey(params);

  return {
    create: {
      onMutate: async (variables: LinkTimelineCreateInput) => {
        return applyOptimisticComment({
          queryClient,
          queryKey,
          variables,
          user,
        });
      },
      onError: (
        _error: Error,
        _vars: LinkTimelineCreateInput,
        context: unknown,
      ) => {
        rollbackOptimisticData(
          queryClient,
          queryKey,
          context as MutationContext | undefined,
        );
      },
    },
    update: {
      onMutate: async (variables: LinkTimelineReactionInput) => {
        return applyOptimisticReaction({ queryClient, queryKey, variables });
      },
      onError: (
        _error: Error,
        _vars: LinkTimelineReactionInput,
        context: unknown,
      ) => {
        rollbackOptimisticData(
          queryClient,
          queryKey,
          context as MutationContext | undefined,
        );
      },
    },
  };
};
