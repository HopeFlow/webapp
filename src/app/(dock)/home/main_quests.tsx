"use client";

import { useInfiniteQuests } from "./useInfinteQuests";
import {
  ContributorQuestCardWithLoading as ContributorQuestCard,
  StarterQuestCardWithLoading as StarterQuestCard,
} from "./quest_card";
import { HomeMain as HomeMainEmpty } from "./main";
import { Button } from "@/components/button";

export function HomeMain() {
  const { data, isLoading, isError, error, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuests({ limit: 10 });

  if (isError) return <div>{(error as Error).message}</div>;
  const items = data?.items ?? [];
  if (!isLoading && items.length === 0) return <HomeMainEmpty />;

  return (
    <div className="w-full space-y-2 overflow-y-auto p-4 md:p-8">
      {items
        .filter((item) => !!item.id)
        .map((quest, i) =>
          quest.isUserSeeker ? (
            <StarterQuestCard
              key={quest.id ?? `q-${i}`}
              bounty={parseFloat(quest.rewardAmount)}
              coverMedia={quest.coverMedia}
              nodes={quest.nodes}
              title={quest.title}
              numberOfLeads={quest.numberOfLeads}
              questState="Young"
              id={quest.id!}
            />
          ) : (
            <ContributorQuestCard
              key={quest.id ?? `q-${i}`}
              bounty={parseFloat(quest.rewardAmount)}
              coverMedia={quest.coverMedia}
              nodes={quest.nodes}
              title={quest.title}
              numberOfLeads={quest.numberOfLeads}
              questState="Young"
              id={quest.id!}
            />
          ),
        )}

      {(isLoading || isFetchingNextPage) &&
        new Array(3)
          .fill(null)
          .map((_, i) =>
            i % 2 === 0 ? (
              <StarterQuestCard key={`skeleton-${i}`} isLoading />
            ) : (
              <ContributorQuestCard key={`skeleton-${i}`} isLoading />
            ),
          )}

      {data?.hasMore && (
        <div className="flex max-w-4xl justify-center pt-4">
          <Button
            buttonType="neutral"
            buttonStyle="outline"
            onClick={() => fetchNextPage()}
            withSpinner={isFetchingNextPage}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
