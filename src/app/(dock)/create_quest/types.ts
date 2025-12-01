import type { CoverPhoto as QuestCoverPhoto, QuestMedia } from "@/db/constants";
export type MediaSource = Omit<QuestMedia, "type" | "url"> &
  ({ type: "video"; url: string } | { type: "image"; content: File });
export type CoverPhoto = Omit<QuestCoverPhoto, "url"> & { content: File };
export type InsertQuestData = {
  type: "restricted" | "unrestricted";
  title: string;
  shareTitle: string;
  description: string;
  rewardAmount: number;
  coverPhoto: CoverPhoto;
  media: MediaSource[];
};
