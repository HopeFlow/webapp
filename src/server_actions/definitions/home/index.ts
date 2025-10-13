"use server";
import { getHopeflowDatabase } from "@/db";
import { questStatusDef } from "@/db/constants";
import {
  nodeTable,
  proposedAnswerTable,
  questTable,
  questUserRelationTable,
} from "@/db/schema";
import { clerkClientNoThrow, currentUserNoThrow } from "@/helpers/server/auth";
import { createServerAction } from "@/helpers/server/create_server_action";
import { executeWithDateParsing } from "@/helpers/server/db";
import { desc, eq, inArray, sql, SQL } from "drizzle-orm";

type Node = {
  name?: string;
  activityDate: Date;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type QuestCard = {
  title: string;
  isUserSeeker: boolean;
  rewardAmount: string;
  numberOfLeads: number;
  questStatus: (typeof questStatusDef)[number];
  nodes: Array<Node>;
  coverMedia: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  farewellMessage?: string;
  questHealthState: string;
};

function userBranchCtes(
  questId: SQL,
  userId: SQL,
  opts: { up?: boolean; down?: boolean } = { up: true, down: true },
): SQL {
  const parts: SQL[] = [];

  // always need the anchor
  parts.push(sql`
    user_node AS (
      SELECT *, 0 AS depth
        FROM ${nodeTable}
       WHERE ${nodeTable.questId} = ${questId}
         AND ${nodeTable.userId}  = ${userId}
    )
  `);

  if (opts.up) {
    parts.push(sql`
      upward AS (
        SELECT ${nodeTable}.*, (-1) as depth FROM ${nodeTable}, user_node WHERE ${
      nodeTable.id
    } = user_node."${sql.raw(nodeTable.parentId.name)}"
        UNION
        SELECT n.*, (u.depth - 1) as depth FROM upward u, ${nodeTable} n
        WHERE n."${sql.raw(nodeTable.id.name)}" = u."${sql.raw(
      nodeTable.parentId.name,
    )}"
      )
    `);
  }

  if (opts.down) {
    parts.push(sql`
      downward AS (
        SELECT ${nodeTable}.*, 1 as depth FROM ${nodeTable}, user_node WHERE ${
      nodeTable.parentId
    } = user_node."${sql.raw(nodeTable.id.name)}"
        UNION
        SELECT n.*, (d.depth + 1) as depth FROM downward d, ${nodeTable} n
        WHERE n."${sql.raw(nodeTable.parentId.name)}" = d."${sql.raw(
      nodeTable.id.name,
    )}"
      )
    `);
  }

  return sql`WITH RECURSIVE ${sql.join(parts, sql`, `)}`;
}

/**
 * Builds a recursive SQL query that, for a given quest and user:
 *   1. Finds the user’s own node (depth = 0)
 *   2. Walks “upward” to fetch all ancestors (parents, grandparents, …) with negative depths
 *   3. Walks “downward” to fetch all descendants (children, grandchildren, …) with positive depths
 * Finally returns every node in that “branch,” ordered by depth from topmost ancestor to deepest descendant.
 *
 * @param questId - a Drizzle‐SQL fragment representing the quest ID filter
 * @param userId  - a Drizzle‐SQL fragment representing the user ID filter
 * @returns a Drizzle SQL template that yields rows of `nodeTable` plus a `depth` column
 **/
function getAllParentNodes(questId: SQL, userId: SQL) {
  return sql`
    ${userBranchCtes(questId, userId, { up: true, down: false })}
    SELECT * FROM (
      SELECT * FROM upward
      UNION
      SELECT * FROM user_node
    ) branch
    ORDER BY depth
  `;
}

const getClerkUsersFromUserIds = async (userIds: string[]) => {
  const clerkClient = await clerkClientNoThrow();
  const users = await Promise.all(
    userIds.map((userId) => clerkClient?.users.getUser(userId)),
  );
  return users;
};

const calculateNodes = async (
  questId: string,
  userId: string,
  isUserSeeker: boolean,
): Promise<Array<Node>> => {
  const db = await getHopeflowDatabase();
  if (isUserSeeker) {
    // get all nodes for the quest sorted by activity date
    const nodes = await db
      .select()
      .from(questUserRelationTable)
      .where(eq(questUserRelationTable.questId, questId))
      .orderBy(desc(questUserRelationTable.createdAt));

    const clerkUsers = await getClerkUsersFromUserIds(
      nodes.map((node) => node.userId),
    );
    const result = nodes.map((node) => {
      const clerkUser = clerkUsers?.find((user) => user?.id === node.userId);
      return {
        name: clerkUser?.fullName || undefined,
        activityDate: node.createdAt,
        imageUrl: clerkUser?.imageUrl || undefined,
      };
    });
    return result;
  } else {
    // get nodes from seeker to the contributor node.
    const nodes = await executeWithDateParsing<
      typeof nodeTable.$inferSelect & { depth: number }
    >(getAllParentNodes(sql`${questId}`, sql`${userId}`), db);
    const clerkUsers = await getClerkUsersFromUserIds(
      nodes.map((node) => node.userId),
    );
    const result = nodes.map((node) => {
      const clerkUser = clerkUsers?.find((user) => user?.id === node.userId);
      return {
        name: clerkUser?.fullName || undefined,
        activityDate: node.createdAt,
        imageUrl: clerkUser?.imageUrl || undefined,
      };
    });
    return result;
  }
};

export const quests = createServerAction({
  id: "quests",
  scope: "home",
  execute: async (offset: number, limit: number): Promise<QuestCard[]> => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Unauthenticated");
    const db = await getHopeflowDatabase();
    // 1) Get ALL relations for this user (page)
    const relations = await db
      .select({
        questId: questUserRelationTable.questId,
        createdAt: questUserRelationTable.createdAt,
      })
      .from(questUserRelationTable)
      .where(eq(questUserRelationTable.userId, user.id))
      .orderBy(desc(questUserRelationTable.createdAt))
      .offset(offset)
      .limit(limit);

    if (relations.length === 0) return [];
    const questIds = [...new Set(relations.map((r) => r.questId))];
    // 2) Fetch all quests
    const quests = await db
      .select()
      .from(questTable)
      .where(inArray(questTable.id, questIds));

    // 3) Count proposed answers per quest in one grouped query
    // drizzle for sqlite: use sql`COUNT(*)` and groupBy
    const counts = await db
      .select({
        questId: proposedAnswerTable.questId,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(proposedAnswerTable)
      .where(inArray(proposedAnswerTable.questId, questIds))
      .groupBy(proposedAnswerTable.questId);

    const leadCountByQuestId = new Map(
      counts.map((c) => [c.questId, Number(c.count)]),
    );

    const questCards: QuestCard[] = await Promise.all(
      quests.map(async (quest) => {
        const coverMedia = [quest.coverPhoto]; // TODO: Add media as well.
        const isUserSeeker = quest.seekerId === user.id;
        const nodes = await calculateNodes(quest.id, user.id, isUserSeeker);
        return {
          title: quest.title,
          isUserSeeker,
          rewardAmount: quest.rewardAmount,
          questStatus: quest.status,
          numberOfLeads: leadCountByQuestId.get(quest.id) ?? 0,
          nodes,
          coverMedia,
          farewellMessage: quest.farewellMessage || undefined,
          questHealthState: "", // TODO: Placeholder, replace with actual logic to calculate quest health state
        };
      }),
    );
    return questCards;
  },
});
