import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { ensureCreatedFlag } from "../../helpers/server/profile";

type ParamsType = Parameters<typeof ensureCreatedFlag>;
type RetType = Awaited<ReturnType<typeof ensureCreatedFlag>>;
type OptionsType = Omit<
  UseMutationOptions<
    RetType,
    unknown,
    {
      clerkUsers: ParamsType[0];
      userId: ParamsType[1];
      already: ParamsType[2];
    },
    unknown
  >,
  "mutationFn"
>;

export function useEnsureCreatedFlag(options?: OptionsType) {
  return useMutation({
    mutationKey: ["common", "ensureCreatedFlag"] as const,
    mutationFn: ({ clerkUsers, userId, already }) =>
      ensureCreatedFlag(clerkUsers, userId, already),
    ...(options ?? {}),
  });
}
