// hooks/useInfiniteQuests.ts
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { quests } from "./home.api"; // same import your generator uses

type Quest = {
  id?: string;
  title: string;
  rewardAmount: string;
  coverMedia: readonly {
    url: string;
    alt?: string;
    width: number;
    height: number;
  }[];
  nodes: Array<{
    name: string;
    activityDate: Date;
    imageUrl: string;
    imageWidth?: number;
    imageHeight?: number;
  }>;
  numberOfLeads: number;
  isUserSeeker: boolean;
};

type Page = { items: Quest[]; hasMore: boolean; nextOffset?: number };
type FlatData = { items: Quest[]; hasMore: boolean };

export function useInfiniteQuests({ limit = 10 }: { limit?: number }) {
  return useInfiniteQuery<
    Page, // TQueryFnData
    Error, // TError
    FlatData, // TData (what select returns)
    ["quests-infinite", { limit: number }], // TQueryKey
    number // TPageParam (our offset)
  >({
    queryKey: ["quests-infinite", { limit }],
    initialPageParam: 0, // offset
    queryFn: async ({ pageParam }) =>
      quests({ limit, offset: Number(pageParam) || 0 }),
    getNextPageParam: (last) => last.nextOffset,
    select: (data) => ({
      items: data.pages.flatMap((p) => p.items),
      hasMore: Boolean(data.pages.at(-1)?.hasMore),
    }),
  });
}
