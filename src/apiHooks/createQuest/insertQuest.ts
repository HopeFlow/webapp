import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { insertQuest } from "../../app/(dock)/create_quest/create_quest.api";

type ParamsType = Parameters<typeof insertQuest>;
type RetType = Awaited<ReturnType<typeof insertQuest>>;
type OptionsType = Omit<
  UseMutationOptions<RetType, unknown, ParamsType[0], unknown>,
  "mutationFn"
>;

export function useInsertQuest(options?: OptionsType) {
  return useMutation({
    mutationKey: ["createQuest", "insertQuest"] as const,
    mutationFn: (payload) => insertQuest(payload),
    ...(options ?? {}),
  });
}
