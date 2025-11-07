"use client";

import { type ReactNode } from "react";
import { EyeIcon } from "@/components/icons/eye";
import { MediatorsIcon } from "@/components/icons/mediators";
import { BulbIcon } from "@/components/icons/bulb";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";

export type TimelineStat = {
  id: string;
  icon: "views" | "shares" | "leads" | "comments";
  text: ReactNode;
};

export function LinkTimelineStats({
  stats: _stats,
}: {
  stats: TimelineStat[];
}) {
  return (
    <div className="flex flex-col">
      <b className="mb-3 font-bold">Statistics</b>
      {_stats.map((stat) => (
        <div key={stat.id} className="flex flex-row gap-4">
          {iconForStat(stat.icon)}
          {stat.text}
        </div>
      ))}
    </div>
  );
}

const iconForStat = (icon: TimelineStat["icon"]) => {
  switch (icon) {
    case "views":
      return <EyeIcon />;
    case "shares":
      return <MediatorsIcon />;
    case "leads":
      return <BulbIcon />;
    case "comments":
      return <ChatBubbleIcon />;
    default:
      return null;
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TIMELINE_STATS: TimelineStat[] = [
  { id: "views", icon: "views", text: "150 people have seen this quest" },
  { id: "shares", icon: "shares", text: "10 people shared this quest" },
  { id: "leads", icon: "leads", text: "No one submitted any leads" },
  { id: "comments", icon: "comments", text: "Martha commented on the quest" },
];
