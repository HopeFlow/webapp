import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { reactToLinkTimelineComment } from "../../app/(nodock)/link/timeline.api";

type ParamsType = Parameters<typeof reactToLinkTimelineComment>;
type RetType = Awaited<ReturnType<typeof reactToLinkTimelineComment>>;
type OptionsType = Omit<
  UseMutationOptions<RetType, unknown, ParamsType[0], unknown>,
  "mutationFn"
>;

export function useReactToLinkTimelineComment(options?: OptionsType) {
  return useMutation({
    mutationKey: ["link", "reactToLinkTimelineComment"] as const,
    mutationFn: ({ commentId, reaction, referer, linkCode }) =>
      reactToLinkTimelineComment({ commentId, reaction, referer, linkCode }),
    ...(options ?? {}),
  });
}
