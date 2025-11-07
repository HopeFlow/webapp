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
  viewer: { canComment: boolean; canReact: boolean };
}

export interface LinkTimelineCreateInput {
  content: string;
}

export interface LinkTimelineReactionInput {
  commentId: string;
  reaction: LinkTimelineReaction | null;
}

export interface LinkTimelineReadParams {
  linkCode: string;
}
