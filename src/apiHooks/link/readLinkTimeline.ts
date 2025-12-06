import { useQuery, QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { readLinkTimeline } from "../../app/(nodock)/link/timeline.api";

type ParamsType = Parameters<typeof readLinkTimeline>;
type RetType = Awaited<ReturnType<typeof readLinkTimeline>>;
type OptionsType = Omit<
  UseQueryOptions<RetType, unknown>,
  "queryKey" | "queryFn"
>;

export function getReadLinkTimelineQueryKey(
  ...params: ParamsType
): readonly unknown[] {
  return [
    "link",
    "readLinkTimeline",
    ...(params as readonly unknown[]),
  ] as const;
}

export function getReadLinkTimelineQueryOptions(...params: ParamsType) {
  return {
    queryKey: getReadLinkTimelineQueryKey(...params),
    queryFn: () => readLinkTimeline(...params),
  } as const;
}

export function prefetchReadLinkTimeline(...params: ParamsType) {
  return (qc: QueryClient) =>
    qc.prefetchQuery(getReadLinkTimelineQueryOptions(...params));
}

export function useReadLinkTimeline(...args: [...ParamsType, OptionsType?]) {
  const options =
    args.length > 1 ? (args[args.length - 1] as OptionsType) : undefined;
  const paramsOnly = (options ? args.slice(0, -1) : args) as ParamsType;
  return useQuery({
    ...getReadLinkTimelineQueryOptions(...(paramsOnly as ParamsType)),
    ...((options as OptionsType | undefined) ?? {}),
  });
}
