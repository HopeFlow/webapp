export const questStatusDef = [
  "draft",
  "active",
  "finished",
  "terminated",
] as const;
export const defaultShareLinkType = ["targeted", "broadcast"] as const;
export const reflowTargetRelationDef = [
  "close_family",
  "longtime_friend",
  "trusted_colleague",
  "acquintance",
  "neighbour",
] as const;
export const nodeStatusDef = [
  "contributed",
  "answered",
  "accepted",
  "rejected",
] as const;
export const chatMessageSentByDef = ["bot", "starter", "contributor"] as const;
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
