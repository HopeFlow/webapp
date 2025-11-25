import { useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { getLinkNodeQueryKey } from "@/server_actions/client/link/linkNode";
import type { SafeUser } from "@/helpers/server/auth";
import type {
  ReFlowNodeSimple,
  SocialMediaName,
} from "./components/ReflowTree";

export const TEMP_OPTIMISTIC_NODE_ID = "temp-optimistic-id";

type LinkNodeReadResult = { treeRoot: ReFlowNodeSimple; userImageUrl?: string };

type MutationContext = { previousData: LinkNodeReadResult | undefined };

export const useLinkNodeMutationOptions = (
  linkCode: string,
  user?: SafeUser,
) => {
  const queryClient = useQueryClient();
  const queryKey = getLinkNodeQueryKey({ linkCode });

  return {
    create: {
      onMutate: async (variables: { referer: SocialMediaName }) => {
        await queryClient.cancelQueries({ queryKey });
        const previousData =
          queryClient.getQueryData<LinkNodeReadResult>(queryKey);
        queryClient.setQueryData<LinkNodeReadResult>(
          queryKey,
          (old: LinkNodeReadResult | undefined) => {
            if (!old || !old.treeRoot) return old;
            const newTreeRoot = JSON.parse(JSON.stringify(old.treeRoot));
            const findAndReplacePotentialNode = (
              node: ReFlowNodeSimple,
            ): boolean => {
              if (node.potentialNode) {
                const mutableNode = node as {
                  -readonly [K in keyof ReFlowNodeSimple]: ReFlowNodeSimple[K];
                };
                mutableNode.id = TEMP_OPTIMISTIC_NODE_ID;
                mutableNode.potentialNode = false;
                mutableNode.imageUrl = user?.imageUrl ?? undefined;
                mutableNode.title =
                  user?.fullName?.trim() ||
                  user?.firstName?.trim() ||
                  user?.lastName?.trim() ||
                  undefined;
                mutableNode.createdAt = new Date();
                mutableNode.referer = variables.referer;
                mutableNode.children = [];
                mutableNode.optimistic = true;
                return true;
              }
              if (node.children) {
                for (const child of node.children) {
                  if (findAndReplacePotentialNode(child)) return true;
                }
              }
              return false;
            };
            findAndReplacePotentialNode(newTreeRoot);
            return { ...old, treeRoot: newTreeRoot };
          },
        );
        return { previousData };
      },
      onError: (
        _err: Error,
        _newTodo: { referer: SocialMediaName },
        context: unknown,
      ) => {
        const mutationContext = context as MutationContext | undefined;
        if (mutationContext?.previousData) {
          queryClient.setQueryData(queryKey, mutationContext.previousData);
        }
      },
    } as UseMutationOptions<
      boolean,
      Error,
      { referer: SocialMediaName },
      unknown
    >,
  };
};
