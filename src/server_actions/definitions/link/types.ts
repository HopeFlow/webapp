import { SocialMediaName } from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";

export type LinkStatusStatIcon = "views" | "shares" | "leads" | "comments";

export type LinkStatusStat = {
  id: LinkStatusStatIcon;
  icon: LinkStatusStatIcon;
  label: string;
  value: string;
  helper?: string;
};

export interface LinkStatsCardReadParams {
  questId: string;
}

export interface LinkStatsCardReadResult {
  stats: LinkStatusStat[];
}

export type LinkTimelineActionType =
  | "started the quest"
  | "joined the quest"
  | "reflowed the quest"
  | "commented on the quest"
  | "presented a lead";

export type LinkTimelineReaction = "like" | "dislike";

export type LinkTimelineCommentRecord = {
  id: string;
  content: string;
  likeCount: number;
  dislikeCount: number;
  viewerReaction: LinkTimelineReaction | null;
};

export type LinkTimelineRecord = {
  id: string;
  type: LinkTimelineActionType;
  name: string;
  imageUrl?: string | null;
  timestamp: string;
  description?: string | null;
  comment?: LinkTimelineCommentRecord | null;
};

export interface LinkTimelineReadResult {
  actions: LinkTimelineRecord[];
}

export interface LinkTimelineCreateInput {
  content: string;
  referer: SocialMediaName;
}

export interface LinkTimelineReactionInput {
  commentId: string;
  reaction: LinkTimelineReaction | null;
  referer: SocialMediaName;
}

export interface LinkTimelineReadParams {
  linkCode: string;
}
