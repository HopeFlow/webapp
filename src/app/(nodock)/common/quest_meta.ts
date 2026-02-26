import { questTable } from "@/db/schema";
import "@/components/button";

export type QuestStatusMeta = {
  label: string;
  description: string;
  variant: "neutral" | "success" | "error" | "warning";
};

export function computeQuestStatusMeta(
  quest: typeof questTable.$inferSelect,
): QuestStatusMeta {
  if (quest.status === "draft")
    return {
      label: "Draft",
      description: "This quest is currently a draft and not visible to others.",
      variant: "neutral",
    };
  if (quest.status === "active")
    return {
      label: "Active",
      description: "This quest is active and open for contributions.",
      variant: "success",
    };
  if (quest.status === "solved")
    return {
      label: "Solved",
      description: "This quest has been solved. Congratulations to the solver!",
      variant: "success",
    };
  if (quest.status === "expired")
    return {
      label: "Expired",
      description:
        "This quest has expired and is no longer accepting contributions.",
      variant: "error",
    };
  // if (quest.status === "terminated")
  return {
    label: "Terminated",
    description:
      "This quest has been terminated by the seeker and is no longer active.",
    variant: "warning",
  };
}
