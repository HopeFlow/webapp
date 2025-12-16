"use server";

import { getHopeflowDatabase } from "@/db";
import {
  commentTable,
  linkTable,
  nodeTable,
  proposedAnswerTable,
  questViewTable,
} from "@/db/schema";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { alias, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { verifyLinkJwtToken } from "@/helpers/server/auth";
import type {
  LinkStatsCardReadParams,
  LinkStatsCardReadResult,
  LinkStatusStat,
  LinkStatusStatIcon,
} from "./types";
import { createApiEndpoint } from "@/helpers/server/create_api_endpoint";

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

export const linkStatsCard = createApiEndpoint({
  uniqueKey: "link::linkStatsCard",
  type: "query",
  // eslint-disable-next-line hopeflow/require-ensure-user-has-role -- handled internally
  handler: async ({ questId, linkCode }: LinkStatsCardReadParams) => {
    const trimmedQuestId = questId?.trim();
    if (!trimmedQuestId) {
      throw new Error("Quest identifier is required");
    }
    const trimmedLinkCode = linkCode?.trim();
    if (!trimmedLinkCode) {
      throw new Error("Link code is required");
    }

    const db = await getHopeflowDatabase();
    const link = await db.query.linkTable.findFirst({
      where: eq(linkTable.linkCode, trimmedLinkCode),
    });
    if (!link) {
      throw new Error("Link not found");
    }
    if (link.questId !== trimmedQuestId) {
      throw new Error("Link does not belong to this quest");
    }
    if (link.type === "targeted") {
      const hasAccess = await verifyLinkJwtToken(link);
      if (!hasAccess) throw new Error("Access to this link is restricted");
    }

    const [views, contributors, leads, comments] = await Promise.all([
      countQuestUniqueViews(db, trimmedQuestId),
      countQuestContributors(db, trimmedQuestId),
      countQuestLeads(db, trimmedQuestId),
      countQuestComments(db, trimmedQuestId),
    ]);

    const stats = buildStatsResponse({ views, contributors, leads, comments });
    return { stats } satisfies LinkStatsCardReadResult;
  },
});
