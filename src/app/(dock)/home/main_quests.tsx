import { mockQuestProps } from "./mock_data";
import { ContributorQuestCard, StarterQuestCard } from "./quest_card";

export function HomeMain() {
  return (
    <div className="w-full p-4 md:p-8 overflow-y-auto">
      {new Array(7)
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
        )}
    </div>
  );
}
