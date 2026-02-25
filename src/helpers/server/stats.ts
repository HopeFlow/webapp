"use server";

import {
  commentTable,
  nodeTable,
  proposedAnswerTable,
  questViewTable,
} from "@/db/schema";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { alias, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import type { getHopeflowDatabase } from "@/db";

export type HopeflowDb = Awaited<ReturnType<typeof getHopeflowDatabase>>;

const DAY_UTC = (column: AnySQLiteColumn) =>
  sql<string>`strftime('%Y%m%d', datetime(${column} / 1000, 'unixepoch', 'utc'))`;

export async function countQuestUniqueViews(
  db: HopeflowDb,
  questId: string,
): Promise<number> {
  const [{ n: loggedIn = 0 } = { n: 0 }] = await db
    .select({ n: sql<number>`COUNT(DISTINCT ${questViewTable.userId})` })
    .from(questViewTable)
    .where(
      and(
        eq(questViewTable.questId, questId),
        isNotNull(questViewTable.userId),
      ),
    );

  const anonView = alias(questViewTable, "anon_view");
  const [{ n: anon = 0 } = { n: 0 }] = await db
    .select({
      n: sql<number>`
        COUNT(
          DISTINCT ${anonView.ipPrefix} || '|' || ${anonView.userAgent} || '|' || ${DAY_UTC(
            anonView.createdAt,
          )}
        )
      `,
    })
    .from(anonView)
    .where(and(eq(anonView.questId, questId), isNull(anonView.userId)));

  return Number(loggedIn ?? 0) + Number(anon ?? 0);
}

export async function countQuestContributors(
  db: HopeflowDb,
  questId: string,
): Promise<number> {
  const [{ n = 0 } = { n: 0 }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(nodeTable)
    .where(and(eq(nodeTable.questId, questId), isNotNull(nodeTable.parentId)));
  return Number(n ?? 0);
}

export async function countQuestLeads(
  db: HopeflowDb,
  questId: string,
): Promise<number> {
  const [{ n = 0 } = { n: 0 }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(proposedAnswerTable)
    .where(eq(proposedAnswerTable.questId, questId));
  return Number(n ?? 0);
}

export async function countQuestComments(
  db: HopeflowDb,
  questId: string,
): Promise<number> {
  const [{ n = 0 } = { n: 0 }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(commentTable)
    .where(eq(commentTable.questId, questId));
  return Number(n ?? 0);
}
