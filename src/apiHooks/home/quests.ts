import { useQuery, QueryClient, UseQueryOptions } from "@tanstack/react-query";
import { quests } from "../../app/(dock)/home/home.api";

type ParamsType = Parameters<typeof quests>;
type RetType = Awaited<ReturnType<typeof quests>>;
type OptionsType = Omit<
  UseQueryOptions<RetType, unknown>,
  "queryKey" | "queryFn"
>;

export function getQuestsQueryKey(...params: ParamsType): readonly unknown[] {
  return ["home", "quests", ...(params as readonly unknown[])] as const;
}

export function getQuestsQueryOptions(...params: ParamsType) {
  return {
    queryKey: getQuestsQueryKey(...params),
    queryFn: () => quests(...params),
  } as const;
}

export function prefetchQuests(...params: ParamsType) {
  return (qc: QueryClient) =>
    qc.prefetchQuery(getQuestsQueryOptions(...params));
}

export function useQuests(...args: [...ParamsType, OptionsType?]) {
  const options =
    args.length > 1 ? (args[args.length - 1] as OptionsType) : undefined;
  const paramsOnly = (options ? args.slice(0, -1) : args) as ParamsType;
  return useQuery({
    ...getQuestsQueryOptions(...(paramsOnly as ParamsType)),
    ...((options as OptionsType | undefined) ?? {}),
  });
}
