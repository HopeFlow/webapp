import { useQuery, QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { readNodes } from "../../app/(nodock)/link/node.api";

type ParamsType = Parameters<typeof readNodes>;
type RetType = Awaited<ReturnType<typeof readNodes>>;
type OptionsType = Omit<
  UseQueryOptions<RetType, unknown>,
  "queryKey" | "queryFn"
>;

export function getReadNodesQueryKey(
  ...params: ParamsType
): readonly unknown[] {
  return ["link", "readNodes", ...(params as readonly unknown[])] as const;
}

export function getReadNodesQueryOptions(...params: ParamsType) {
  return {
    queryKey: getReadNodesQueryKey(...params),
    queryFn: () => readNodes(...params),
  } as const;
}

export function prefetchReadNodes(...params: ParamsType) {
  return (qc: QueryClient) =>
    qc.prefetchQuery(getReadNodesQueryOptions(...params));
}

export function useReadNodes(...args: [...ParamsType, OptionsType?]) {
  const options =
    args.length > 1 ? (args[args.length - 1] as OptionsType) : undefined;
  const paramsOnly = (options ? args.slice(0, -1) : args) as ParamsType;
  return useQuery({
    ...getReadNodesQueryOptions(...(paramsOnly as ParamsType)),
    ...((options as OptionsType | undefined) ?? {}),
  });
}
