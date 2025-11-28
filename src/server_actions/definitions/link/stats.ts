"use server";

import { getHopeflowDatabase } from "@/db";
import {
  commentTable,
  linkTable,
  nodeTable,
  proposedAnswerTable,
  questViewTable,
} from "@/db/schema";
import { createServerAction } from "@/helpers/server/create_server_action";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { alias, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type {
  LinkStatsCardReadParams,
  LinkStatsCardReadResult,
  LinkStatusStat,
  LinkStatusStatIcon,
} from "./types";

type HopeflowDb = Awaited<ReturnType<typeof getHopeflowDatabase>>;

const DAY_UTC = (column: AnySQLiteColumn) =>
  sql<string>`strftime('%Y%m%d', datetime(${column} / 1000, 'unixepoch', 'utc'))`;

const STATS_META: Record<
  LinkStatusStatIcon,
  { label: string; helper: string }
> = {
  views: { label: "Views", helper: "people have seen this quest" },
  contributors: { label: "Contributors", helper: "community members joined" },
  leads: { label: "Leads", helper: "qualified answers submitted" },
  comments: { label: "Comments", helper: "recent check-ins" },
};

const numberFormatter = new Intl.NumberFormat("en-US");

async function countQuestUniqueViews(
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

async function countQuestContributors(
  db: HopeflowDb,
  questId: string,
): Promise<number> {
  const [{ n = 0 } = { n: 0 }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(nodeTable)
    .where(and(eq(nodeTable.questId, questId), isNotNull(nodeTable.parentId)));
  return Number(n ?? 0);
}

async function countQuestLeads(
  db: HopeflowDb,
  questId: string,
): Promise<number> {
  const [{ n = 0 } = { n: 0 }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(proposedAnswerTable)
    .where(eq(proposedAnswerTable.questId, questId));
  return Number(n ?? 0);
}

async function countQuestComments(
  db: HopeflowDb,
  questId: string,
): Promise<number> {
  const [{ n = 0 } = { n: 0 }] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(commentTable)
    .where(eq(commentTable.questId, questId));
  return Number(n ?? 0);
}

const buildStatsResponse = (
  values: Record<LinkStatusStatIcon, number>,
): LinkStatusStat[] => {
  return (Object.keys(STATS_META) as LinkStatusStatIcon[]).map((id) => {
    const meta = STATS_META[id];
    return {
      id,
      icon: id,
      label: meta.label,
      helper: meta.helper,
      value: numberFormatter.format(values[id] ?? 0),
    };
  });
};

export const linkStatsCard = createServerAction<
  [LinkStatsCardReadParams],
  LinkStatsCardReadResult
>({
  id: "linkStatsCard",
  scope: "link",
  execute: async ({ questId }) => {
    if (!questId?.trim()) {
      throw new Error("Quest identifier is required");
    }

    const db = await getHopeflowDatabase();
    const [views, contributors, leads, comments] = await Promise.all([
      countQuestUniqueViews(db, questId),
      countQuestContributors(db, questId),
      countQuestLeads(db, questId),
      countQuestComments(db, questId),
    ]);

    const stats = buildStatsResponse({ views, contributors, leads, comments });
    return { stats } satisfies LinkStatsCardReadResult;
  },
});
