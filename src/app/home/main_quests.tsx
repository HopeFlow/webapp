import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import { mockQuestProps } from "./mock_data";
import { ContributorQuestCard, StarterQuestCard } from "./quest_card";

export default function HomeMain() {
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar />
      <div className="flex-1 bg-base-200 relative">
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
          <MobileHeader />
          <div className="w-full h-full p-4 md:p-8 gap-4 md:gap-8 flex-1 grid grid-cols-1 md:grid-cols-1 items-center justify-center relative overflow-y-scroll">
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
          <MobileDock />
        </div>
      </div>
    </div>
  );
}
