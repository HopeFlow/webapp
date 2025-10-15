"use client";

import { useQuests } from "@/server_actions/client/home/quests";
import { mockQuestProps } from "./mock_data";
import { ContributorQuestCard, StarterQuestCard } from "./quest_card";

export function HomeMain() {
  const { data, isLoading, isError, error } = useQuests({
    limit: 7,
    offset: 0,
  });
  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>{error.message}</div>;
  // console.log(data);
  return (
    <div className="w-full p-4 md:p-8 overflow-y-auto">
      {/* {new Array(7)
        .fill(null)
        .map((_, i) =>
          i % 2 === 0 ? (
            <StarterQuestCard
              key={`q-${i}`}
              {...mockQuestProps[i % mockQuestProps.length]}
            />
          ) : (
            <ContributorQuestCard
              key={`q-${i}`}
              {...mockQuestProps[i % mockQuestProps.length]}
            />
          ),
        )} */}
      {data!.map((quest, i) => {
        return quest.isUserSeeker ? (
          <StarterQuestCard
            key={`q-${i}`}
            bounty={parseFloat(quest.rewardAmount)}
            coverMedia={quest.coverMedia}
            nodes={quest.nodes}
            title={quest.title}
            numberOfLeads={quest.numberOfLeads}
            questState={"Young"}
          />
        ) : (
          <ContributorQuestCard
            key={`q-${i}`}
            bounty={parseFloat(quest.rewardAmount)}
            coverMedia={quest.coverMedia}
            nodes={quest.nodes}
            title={quest.title}
            numberOfLeads={quest.numberOfLeads}
            questState={"Young"}
          />
        );
      })}
    </div>
  );
}
