import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { ensureOAuthProfileWithDefaults } from "../../app/(nodock)/login/login.api";

type ParamsType = Parameters<typeof ensureOAuthProfileWithDefaults>;
type RetType = Awaited<ReturnType<typeof ensureOAuthProfileWithDefaults>>;
type OptionsType = Omit<
  UseMutationOptions<RetType, unknown, ParamsType[0], unknown>,
  "mutationFn"
>;

export function useEnsureOAuthProfileWithDefaults(options?: OptionsType) {
  return useMutation({
    mutationKey: ["login", "ensureOAuthProfileWithDefaults"] as const,
    mutationFn: (input) => ensureOAuthProfileWithDefaults(input),
    ...(options ?? {}),
  });
}
