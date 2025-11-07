import { cn } from "@/helpers/client/tailwind_helpers";
import Image from "next/image";
import type { CSSProperties } from "react";
import { Button } from "./button";
import { ThumbDownIcon, ThumbUpIcon } from "./icons/thumb";
import { AppTimeAgo } from "@/helpers/client/time";

const TimelineItemMiddle = ({ imageUrl }: { imageUrl?: string }) => (
  <div className="timeline-middle">
    <div className="avatar">
      <div className="w-8 rounded-full">
        <Image
          src={imageUrl ?? "/img/generic_user_image.webp"}
          width={32}
          height={32}
          alt="Jacob"
          className="h-auto max-w-full object-contain"
        />
      </div>
    </div>
  </div>
);

export type UserActionType =
  | "started the quest"
  | "joined the quest"
  | "reflowed the quest"
  | "commented on the quest"
  | "presented a lead";

export type TimelineReaction = "like" | "dislike";

export type TimelineCommentMeta = {
  id: string;
  content?: string;
  likeCount: number;
  dislikeCount: number;
  viewerReaction: TimelineReaction | null;
  onReact?: (reaction: TimelineReaction | null) => void;
  isPending?: boolean;
};

export type UserAction = {
  id?: string;
  type: UserActionType;
  name: string;
  imageUrl?: string;
  timestamp: Date;
  description?: string;
  comment?: TimelineCommentMeta | null;
};

const TimelineItemEnd = ({
  type,
  name,
  timestamp,
  description,
  comment,
}: UserAction) => {
  const netReactions = comment ? comment.likeCount - comment.dislikeCount : 0;
  const likeActive = comment?.viewerReaction === "like";
  const dislikeActive = comment?.viewerReaction === "dislike";
  const disableReactions = !comment?.onReact || comment?.isPending;

  return (
    <div className="timeline-end mt-3 mb-10 md:text-start">
      <div className="text-lg font-black">
        {name} {type}
      </div>
      <div className="font-mono text-neutral-500 italic">
        <AppTimeAgo date={timestamp} />
      </div>
      <p className={cn(type !== "commented on the quest" && "italic")}>
        {description}
      </p>
      {type === "commented on the quest" && comment && (
        <div className="mt-2 flex flex-row items-center gap-2">
          {Math.abs(netReactions) > 0 && (
            <span className="badge badge-primary">
              {netReactions > 0 ? `+${netReactions}` : netReactions}
            </span>
          )}
          <Button
            buttonType="success"
            buttonSize="sm"
            buttonStyle="outline"
            className={cn(likeActive && "btn-active")}
            disabled={disableReactions}
            onClick={() => comment.onReact?.(likeActive ? null : "like")}
          >
            <ThumbUpIcon size={18} />
            <span className="ml-1 text-sm">{comment.likeCount}</span>
          </Button>
          <Button
            buttonType="warning"
            buttonSize="sm"
            buttonStyle="outline"
            className={cn(dislikeActive && "btn-active")}
            disabled={disableReactions}
            onClick={() => comment.onReact?.(dislikeActive ? null : "dislike")}
          >
            <ThumbDownIcon size={18} />
            <span className="ml-1 text-sm">{comment.dislikeCount}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export const Timeline = ({ actions }: { actions: UserAction[] }) => (
  <ul className="timeline timeline-vertical timeline-snap-icon">
    {actions.map(({ imageUrl, ...action }, index, actions) => (
      <li
        key={action.id ?? `h-i-${index}`}
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
