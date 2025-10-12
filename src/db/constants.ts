export const questStatusDef = [
  "draft",
  "active",
  "solved",
  "terminated",
  "expired",
] as const;
export const questTypeDef = ["restricted", "unrestricted"] as const;
export const linkTypeDef = ["targeted", "broadcast"] as const;

export const updateTypeDef = [
  "reflow",
  "answerProposed",
  "answerAccepted",
  "answerRejected",
  "terminated",
  "expired",
  "questEdited",
  "nodeJoined",
  "commentAdded",
] as const;

export const reflowTargetRelationDef = [
  "close_family",
  "longtime_friend",
  "trusted_colleague",
  "acquintance",
  "neighbour",
] as const;

export const nodeStatusDef = [
  "started",
  "askedQuestion",
  "reacted",
  "commented",
  "mediated",
  "proposedAnswer",
  "isAccepted",
  "isRejected",
] as const;

export const messageStatusDef = ["sent", "delivered", "read"] as const;
export const socialMediaNames = [
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "pinterest",
  "tiktok",
  "reddit",
  "snapchat",
  "telegram",
  "whatsapp",
  "unknown",
] as const;
export const emailFrequencyDef = ["immediate", "daily", "weekly"] as const;
export type ScreeningQuestion = {
  question: string;
  answerRequired: boolean;
  answer: string;
};

export type ScreeningAnswer = { questionIndex: number; answer: string; };

export type QuestMedia = {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: "image" | "video";
};
