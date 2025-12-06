import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { addNode } from "../../app/(nodock)/link/node.api";

type ParamsType = Parameters<typeof addNode>;
type RetType = Awaited<ReturnType<typeof addNode>>;
type OptionsType = Omit<
  UseMutationOptions<
    RetType,
    unknown,
    { linkCode: ParamsType[0]; referer: ParamsType[1] },
    unknown
  >,
  "mutationFn"
>;

export function useAddNode(options?: OptionsType) {
  return useMutation({
    mutationKey: ["link", "addNode"] as const,
    mutationFn: ({ linkCode, referer }) => addNode(linkCode, referer),
    ...(options ?? {}),
  });
}
