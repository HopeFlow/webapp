"use server";

import {
  commentTable,
  linkTable,
  nodeTable,
  proposedAnswerTable,
  questHistoryTable,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1/driver";

export type QuestHistoryWithRelations = {
  history: typeof questHistoryTable.$inferSelect;
  comment: typeof commentTable.$inferSelect | null;
  node: typeof nodeTable.$inferSelect | null;
  link: typeof linkTable.$inferSelect | null;
  proposedAnswer: typeof proposedAnswerTable.$inferSelect | null;
};

export const getQuestHistoryWithRelations = async (
  db: DrizzleD1Database<Record<string, unknown>>,
  questId: string,
): Promise<QuestHistoryWithRelations[]> => {
  return await db
    .select({
      history: questHistoryTable,
      comment: commentTable,
      node: nodeTable,
      link: linkTable,
      proposedAnswer: proposedAnswerTable,
    })
    .from(questHistoryTable)
    .leftJoin(commentTable, eq(questHistoryTable.commentId, commentTable.id))
    .leftJoin(nodeTable, eq(questHistoryTable.nodeId, nodeTable.id))
    .leftJoin(linkTable, eq(questHistoryTable.linkId, linkTable.id))
    .leftJoin(
      proposedAnswerTable,
      eq(questHistoryTable.proposedAnswerId, proposedAnswerTable.id),
    )
    .where(eq(questHistoryTable.questId, questId))
    .orderBy(desc(questHistoryTable.createdAt));
};
