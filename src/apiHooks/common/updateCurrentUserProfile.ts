import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { updateCurrentUserProfile } from "../../helpers/server/profile";

type ParamsType = Parameters<typeof updateCurrentUserProfile>;
type RetType = Awaited<ReturnType<typeof updateCurrentUserProfile>>;
type OptionsType = Omit<
  UseMutationOptions<RetType, unknown, ParamsType[0], unknown>,
  "mutationFn"
>;

export function useUpdateCurrentUserProfile(options?: OptionsType) {
  return useMutation({
    mutationKey: ["common", "updateCurrentUserProfile"] as const,
    mutationFn: (data) => updateCurrentUserProfile(data),
    ...(options ?? {}),
  });
}
