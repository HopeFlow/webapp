"use client";

import { BulbIcon } from "@/components/icons/bulb";
import { EyeIcon } from "@/components/icons/eye";
import { MediatorsIcon } from "@/components/icons/mediators";
import { ChatBubbleIcon } from "@/components/icons/chat_bubble";
import type { LinkStatusStat, LinkStatusStatIcon } from "../../types";

const iconForStat = (icon: LinkStatusStatIcon) => {
  const common = "h-5 w-5";

  switch (icon) {
    case "views":
      return <EyeIcon className={common} />;
    case "contributors":
      return <MediatorsIcon className={common} />;
    case "leads":
      return <BulbIcon className={common} />;
    case "comments":
      return <ChatBubbleIcon className={common} />;
    default:
      return null;
  }
};

export const StatsCard = ({ stats }: { stats: LinkStatusStat[] }) => {
  if (!stats.length) {
    return null;
  }

  return (
    <section className="rounded-box border-base-200 bg-base-100/70 text-base-content border text-xs shadow-sm backdrop-blur">
      <div className="divide-base-200 flex flex-wrap divide-y md:flex-nowrap md:divide-x md:divide-y-0">
        {stats.map((stat) => (
          <article
            key={stat.id}
            className="flex w-1/2 min-w-[120px] items-center gap-2 p-3 sm:w-1/4"
            title={stat.helper}
            aria-label={
              stat.helper ? `${stat.label}: ${stat.helper}` : stat.label
            }
          >
            <div className="text-primary p-2">{iconForStat(stat.icon)}</div>
            <div className="flex flex-col">
              <span className="text-base-content/60 text-[0.6rem] font-semibold tracking-wide uppercase">
                {stat.label}
              </span>
              <span className="text-base leading-tight font-bold">
                {stat.value}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
