"use client";

import type { ReactNode } from "react";
import { ReadMore } from "@/components/read_more";
import { Timeline } from "@/components/timeline";
import { EyeIcon } from "@/components/icons/eye";
import { MediatorsIcon } from "@/components/icons/mediators";
import { BulbIcon } from "@/components/icons/bulb";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";

export type TimelineAction = React.ComponentProps<
  typeof Timeline
>["actions"][number];

export type TimelineStat = {
  id: string;
  icon: "views" | "shares" | "leads" | "comments";
  text: ReactNode;
};

export function LinkTimelineContent({
  actions,
}: {
  actions: TimelineAction[];
}) {
  return (
    <ReadMore
      maxHeight="15rem"
      className="card bg-base-100 p-4 outline-1 md:w-2/3"
    >
      <Timeline actions={actions} />
    </ReadMore>
  );
}

export function LinkTimelineStats({ stats }: { stats: TimelineStat[] }) {
  return (
    <div className="flex flex-1 flex-col gap-4 self-stretch">
      <div className="card bg-secondary-content text-secondary border-secondary flex h-[15rem] flex-col items-start justify-start border p-4">
        <b className="mb-3 font-bold">Statistics</b>
        {stats.map((stat) => (
          <div key={stat.id} className="flex flex-row gap-4">
            {iconForStat(stat.icon)}
            {stat.text}
          </div>
        ))}
      </div>
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
