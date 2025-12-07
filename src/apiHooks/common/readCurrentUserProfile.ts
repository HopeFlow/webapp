import { useQuery, QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { readCurrentUserProfile } from "../../helpers/server/profile";

type RetType = Awaited<ReturnType<typeof readCurrentUserProfile>>;
type OptionsType = Omit<
  UseQueryOptions<RetType, unknown>,
  "queryKey" | "queryFn"
>;

export function getReadCurrentUserProfileQueryKey(): readonly unknown[] {
  return ["common", "readCurrentUserProfile"] as const;
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
