import { useQuery, QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { readCurrentUserProfile } from "../../app/(nodock)/create_account/create_account.api";

type RetType = Awaited<ReturnType<typeof readCurrentUserProfile>>;
type OptionsType = Omit<
  UseQueryOptions<RetType, unknown>,
  "queryKey" | "queryFn"
>;

export function getReadCurrentUserProfileQueryKey(): readonly unknown[] {
  return ["createAccount", "getCurrentUserProfile"] as const;
}

export function getReadCurrentUserProfileQueryOptions() {
  return {
    queryKey: getReadCurrentUserProfileQueryKey(),
    queryFn: () => readCurrentUserProfile(),
  } as const;
}

export function prefetchReadCurrentUserProfile() {
  return (qc: QueryClient) =>
    qc.prefetchQuery(getReadCurrentUserProfileQueryOptions());
}

export function useReadCurrentUserProfile(options?: OptionsType) {
  return useQuery({
    ...getReadCurrentUserProfileQueryOptions(),
    ...(options ?? {}),
  });
}
