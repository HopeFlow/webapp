import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { upsertUserProfile } from "../../helpers/server/profile";

type ParamsType = Parameters<typeof upsertUserProfile>;
type RetType = Awaited<ReturnType<typeof upsertUserProfile>>;
type OptionsType = Omit<
  UseMutationOptions<
    RetType,
    unknown,
    {
      userId: ParamsType[0];
      userPreferences: ParamsType[1];
      firstNameRaw: ParamsType[2];
    },
    unknown
  >,
  "mutationFn"
>;

export function useUpsertUserProfile(options?: OptionsType) {
  return useMutation({
    mutationKey: ["common", "upsertUserProfile"] as const,
    mutationFn: ({ userId, userPreferences, firstNameRaw }) =>
      upsertUserProfile(userId, userPreferences, firstNameRaw),
    ...(options ?? {}),
  });
}
