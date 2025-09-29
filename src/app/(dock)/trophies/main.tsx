import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/helpers/client/tailwind_helpers";

interface TrophyCardProps {
  title: string;
  value: number | string | undefined;
  subtitle: string;
  icon: string;
  emptyMessage: string;
}

function TrophyCard({
  title,
  value,
  subtitle,
  icon,
  emptyMessage,
}: TrophyCardProps) {
  const isEmpty = value === 0 || value === undefined;

  return (
    <div
      className={cn(
        "card border border-base-content/30 flex-shrink-0 w-xl max-w-full p-6 flex flex-col gap-4 bg-base-100 text-center transition-all duration-300",
        isEmpty ? "opacity-75" : "",
      )}
    >
      <div className={`text-5xl ${isEmpty ? "opacity-40" : ""}`}>{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {isEmpty ? (
        <div className="text-base text-gray-400 italic">{emptyMessage}</div>
      ) : (
        <div className="text-3xl font-bold text-indigo-600">{value}</div>
      )}
      {!isEmpty && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

export function TrophiesMain() {
  const cards: TrophyCardProps[] = [
    {
      title: "Contributed Quests",
      value: 3,
      subtitle: "You helped move stories forward.",
      emptyMessage: "Your first contribution will light a spark.",
      icon: "🤝",
    },
    {
      title: "Initiated Quests",
      value: 1,
      subtitle: "Your call for help inspired action.",
      emptyMessage: "Your voice has yet to start a ripple.",
      icon: "📣",
    },
    {
      title: "Solved Quests You Contributed",
      value: 1,
      subtitle:
        "You were part of the solution but not necessarily in the winning path.",
      emptyMessage: "Your help could complete someone’s journey.",
      icon: "🎯",
    },
    {
      title: "Winner Chain Contributions",
      value: 1,
      subtitle: "You were in the winning path.",
      emptyMessage: "One quest away from joining a success story.",
      icon: "🏆",
    },
    {
      title: "Branches You’ve Grown",
      value: 20,
      subtitle: "Quest participations sparked through your reflow paths.",
      emptyMessage: "Your tree of trust is waiting to grow.",
      icon: "🌱",
    },
    {
      title: "Top Chain Rank Achieved",
      value: 0,
      subtitle: "Closest you've been to the answer.",
      emptyMessage: "Greatness begins with one bold step.",
      icon: "🥇",
    },
  ];
  return (
    <div className="w-full flex-1 flex flex-col gap-12 items-center justify-center relative">
      <div className="w-full flex-1 p-8 min-h-full overflow-auto">
        <div className="w-full flex flex-col gap-8 items-center justify-center">
          {cards.map((item) => (
            <TrophyCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
