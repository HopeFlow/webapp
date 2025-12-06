import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { addLinkTimelineComment } from "../../app/(nodock)/link/timeline.api";

type ParamsType = Parameters<typeof addLinkTimelineComment>;
type RetType = Awaited<ReturnType<typeof addLinkTimelineComment>>;
type OptionsType = Omit<
  UseMutationOptions<RetType, unknown, ParamsType[0], unknown>,
  "mutationFn"
>;

export function useAddLinkTimelineComment(options?: OptionsType) {
  return useMutation({
    mutationKey: ["link", "addLinkTimelineComment"] as const,
    mutationFn: ({ content, referer, linkCode }) =>
      addLinkTimelineComment({ content, referer, linkCode }),
    ...(options ?? {}),
  });
}
