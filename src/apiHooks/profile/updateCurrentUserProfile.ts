import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { updateCurrentUserProfile } from "../../app/(dock)/profile/profile.api";

type ParamsType = Parameters<typeof updateCurrentUserProfile>;
type RetType = Awaited<ReturnType<typeof updateCurrentUserProfile>>;
type OptionsType = Omit<
  UseMutationOptions<RetType, unknown, ParamsType[0], unknown>,
  "mutationFn"
>;

export function useUpdateCurrentUserProfile(options?: OptionsType) {
  return useMutation({
    mutationKey: ["profile", "updateCurrentUserProfile"] as const,
    mutationFn: (data) => updateCurrentUserProfile(data),
    ...(options ?? {}),
  });
}
