import { useQuery, QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { linkStatsCard } from "../../app/(nodock)/link/stats.api";

type ParamsType = Parameters<typeof linkStatsCard>;
type RetType = Awaited<ReturnType<typeof linkStatsCard>>;
type OptionsType = Omit<
  UseQueryOptions<RetType, unknown>,
  "queryKey" | "queryFn"
>;

export function getLinkStatsCardQueryKey(
  ...params: ParamsType
): readonly unknown[] {
  return ["link", "linkStatsCard", ...(params as readonly unknown[])] as const;
}

export function getLinkStatsCardQueryOptions(...params: ParamsType) {
  return {
    queryKey: getLinkStatsCardQueryKey(...params),
    queryFn: () => linkStatsCard(...params),
  } as const;
}

export function prefetchLinkStatsCard(...params: ParamsType) {
  return (qc: QueryClient) =>
    qc.prefetchQuery(getLinkStatsCardQueryOptions(...params));
}

export function useLinkStatsCard(...args: [...ParamsType, OptionsType?]) {
  const options =
    args.length > 1 ? (args[args.length - 1] as OptionsType) : undefined;
  const paramsOnly = (options ? args.slice(0, -1) : args) as ParamsType;
  return useQuery({
    ...getLinkStatsCardQueryOptions(...(paramsOnly as ParamsType)),
    ...((options as OptionsType | undefined) ?? {}),
  });
}
