import { cn } from "@/helpers/client/tailwind_helpers";

interface AchievementCardProps {
  title: string;
  value: number | string | undefined;
  subtitle: string;
  icon: string;
  emptyMessage: string;
}

function AchievementCard({
  title,
  value,
  subtitle,
  icon,
  emptyMessage,
}: AchievementCardProps) {
  const isEmpty = value === 0 || value === undefined;

  return (
    <div
      className={cn(
        "card border-base-content/30 bg-base-100 flex w-xl max-w-full flex-shrink-0 flex-col gap-4 border p-6 text-center transition-all duration-300",
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

export function AchievementsMain() {
  const cards: AchievementCardProps[] = [
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
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-12">
      <div className="min-h-full w-full flex-1 overflow-auto p-8">
        <div className="flex w-full flex-col items-center justify-center gap-8">
          {cards.map((item) => (
            <AchievementCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
