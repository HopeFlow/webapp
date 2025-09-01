import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";
import type { CSSProperties } from "react";
import { Button } from "./button";
import { ThumbDownIcon, ThumbUpIcon } from "./icons/thumb";

const TimelineItemMiddle = ({ imageUrl }: { imageUrl?: string }) => (
  <div className="timeline-middle">
    <div className="avatar ">
      <div className="w-8 rounded-full">
        <Image
          src={imageUrl ?? "/img/generic_user_image.webp"} // TODO: Find all instances of generic_user_image.webp and refactor
          width={32}
          height={32}
          alt="Jacob"
          className="max-w-full h-auto object-contain"
        />
      </div>
    </div>
  </div>
);

export type UserActionType =
  | "started the quest"
  | "reflowed the quest"
  | "commented on the quest"
  | "presented a lead";

export type UserAction = {
  type: UserActionType;
  name: string;
  imageUrl?: string;
  timestamp: Date;
  description?: string;
};

const formatTimestamp = (timestamp: Date) => {
  const h = timestamp.getHours();
  const m = timestamp.getMinutes();
  const timePart = `${h % 12}:${m}'${h < 12 ? "AM" : "PM"}`;
  const y = timestamp.getFullYear();
  const n = timestamp.getMonth();
  const d = timestamp.getDate();
  const date = new Date(y, n, d);
  const delta = Date.now() - date.valueOf();
  if (delta < 24 * 60 * 60 * 1000) return `Today,${timePart}`;
  if (delta < 2 * 24 * 60 * 60 * 1000) return `Yesterday,${timePart}`;
  return `${d}/${n}/${y},${timePart}`;
};

const TimelineItemEnd = ({
  type,
  name,
  timestamp,
  description,
}: UserAction) => (
  <div className="timeline-end mt-3 mb-10 md:text-start">
    <div className="text-lg font-black">
      {name} {type}
    </div>
    <div className="font-mono italic text-neutral-500">
      {formatTimestamp(timestamp)}
    </div>
    <p className={cn(type !== "commented on the quest" && "italic")}>
      {description}
    </p>
    {type === "commented on the quest" && (
      <div className="mt-2 flex flex-row gap-2 items-center">
        <b className="badge badge-primary">+12</b>
        <Button buttonType="success" buttonSize="sm" buttonStyle="outline">
          <ThumbUpIcon size={18} />
        </Button>
        <Button buttonType="warning" buttonSize="sm" buttonStyle="outline">
          <ThumbDownIcon size={18} />
        </Button>
      </div>
    )}
  </div>
);

export const Timeline = ({ actions }: { actions: UserAction[] }) => (
  <ul className="timeline timeline-vertical timeline-snap-icon">
    {actions.map(({ imageUrl, ...action }, index, actions) => (
      <li
        key={`h-i-${index}`}
        style={{ "--timeline-col-start": "auto" } as CSSProperties}
      >
        {index > 0 && <hr />}
        <TimelineItemMiddle imageUrl={imageUrl} />
        <TimelineItemEnd {...action} />
        {index < actions.length - 1 && <hr />}
      </li>
    ))}
  </ul>
);
