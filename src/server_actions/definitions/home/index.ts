"use server";
import { getHopeflowDatabase } from "@/db";
import { questStatusDef } from "@/db/constants";
import {
  linkTable,
  nodeTable,
  proposedAnswerTable,
  questTable,
} from "@/db/schema";
import { clerkClientNoThrow, currentUserNoThrow } from "@/helpers/server/auth";
import { createServerAction } from "@/helpers/server/create_server_action";
import { executeWithDateParsing } from "@/helpers/server/db";
import { and, eq, inArray, sql } from "drizzle-orm";

type Node = {
  name: string;
  activityDate: Date;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type QuestCard = {
  id?: string;
  title: string;
  isUserSeeker: boolean;
  rewardAmount: string;
  numberOfLeads: number;
  questStatus: (typeof questStatusDef)[number];
  nodes: Array<Node>;
  coverMedia: Array<{ url: string; width: number; height: number }>;
  farewellMessage?: string;
  questHealthState: string;
};

// ---- helpers ---------------------------------------------------------------

const getClerkUserMap = async (userIds: string[]) => {
  const unique = [...new Set(userIds)];
  if (unique.length === 0)
    return new Map<string, { fullName?: string; imageUrl?: string }>();

  const clerk = await clerkClientNoThrow();

  // Prefer a bulk API if available in your Clerk version:
  // const res = await clerk?.users.getUserList({ userId: unique });
  // Fallback: parallel getUser (still deduped)
  const users = await Promise.all(
    unique.map((id) => clerk?.users.getUser(id).catch(() => undefined)),
  );

  const map = new Map<string, { fullName?: string; imageUrl?: string }>();
  users.forEach((u) => {
    if (u)
      map.set(u.id, {
        fullName: u.fullName ?? undefined,
        imageUrl: u.imageUrl ?? undefined,
      });
  });
  return map;
};

// Renders alias-qualified column names like: n."userId"
const qualify = (alias: string, c: { name: string }) =>
  sql.raw(`${alias}."${c.name}"`);

// Build one recursive CTE that finds the path from each *current user's* node
// up to the root, for ALL target quests at once.
const getAllParentNodesForManyQuests = (questIds: string[], userId: string) => {
  return sql`
    WITH RECURSIVE
    user_node AS (
      SELECT n.*, 0 AS depth
      FROM ${nodeTable} AS n
      WHERE ${qualify("n", nodeTable.userId)} = ${userId}
        AND ${qualify("n", nodeTable.questId)} IN (${sql.join(
          questIds,
          sql`, `,
        )})
    ),
    upward AS (
      SELECT p.*, -1 AS depth
      FROM ${nodeTable} AS p
      JOIN user_node AS u
        ON ${qualify("p", nodeTable.id)} = ${sql.raw(
          `u."${nodeTable.parentId.name}"`,
        )}
      UNION ALL
      SELECT p.*, (u.depth - 1) AS depth
      FROM upward AS u
      JOIN ${nodeTable} AS p
        ON ${qualify("p", nodeTable.id)} = ${sql.raw(
          `u."${nodeTable.parentId.name}"`,
        )}
       AND ${qualify("p", nodeTable.questId)} = ${sql.raw(
         `u."${nodeTable.questId.name}"`,
       )}
    ),
    branch AS (
      SELECT * FROM upward
      UNION ALL
      SELECT * FROM user_node
    )
    SELECT *
    FROM branch
    ORDER BY ${sql.raw(`"${nodeTable.questId.name}"`)}, depth;
  `;
};

export type QuestsPage = {
  items: QuestCard[];
  hasMore: boolean;
  nextOffset?: number;
};

export const quests = createServerAction({
  id: "quests",
  scope: "home",
  execute: async (params: {
    offset: number;
    limit: number;
  }): Promise<QuestsPage> => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Unauthenticated");
    const db = await getHopeflowDatabase();
    // 1) Gather quests the user is related to (seeker, contributor, or bookmark)
    //    and keep the oldest interaction timestamp per quest for pagination.
    const relationsPlusOne = await executeWithDateParsing<{
      questId: string;
      createdAt: Date;
    }>(
      sql`
          WITH raw AS (
            SELECT ${questTable.id} AS questId, ${questTable.creationDate} AS createdAt
            FROM ${questTable}
            WHERE ${questTable.seekerId} = ${user.id}
          UNION ALL
            SELECT ${nodeTable.questId} AS questId, ${nodeTable.createdAt} AS createdAt
            FROM ${nodeTable}
            WHERE ${nodeTable.userId} = ${user.id}
          ),
          dedup AS (
            SELECT questId, MIN(createdAt) AS createdAt
            FROM raw
            GROUP BY questId
          )
          SELECT questId, createdAt
          FROM dedup
          ORDER BY createdAt DESC
          LIMIT ${params.limit + 1}
          OFFSET ${params.offset}
        `,
      db,
    );

    const hasMore = relationsPlusOne.length > params.limit;
    const pageRelations = relationsPlusOne.slice(0, params.limit);

    if (pageRelations.length === 0) {
      return { items: [], hasMore: false, nextOffset: undefined };
    }

    const questIds = [...new Set(pageRelations.map((r) => r.questId))];

    // 2) Fetch all quests
    const quests = await db
      .select({
        id: questTable.id,
        title: questTable.title,
        seekerId: questTable.seekerId,
        status: questTable.status,
        rewardAmount: questTable.rewardAmount,
        farewellMessage: questTable.farewellMessage,
        coverPhoto: questTable.coverPhoto,
        creationDate: questTable.creationDate,
      })
      .from(questTable)
      .where(inArray(questTable.id, questIds));

    const questsById = new Map(quests.map((q) => [q.id, q]));

    // 2) Count proposed answers per quest in one grouped query
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

    // 3a) Merge seeker, contributor, and bookmark activity so seeker cards
    //     can render recent participant avatars without extra joins later.
    type ParticipantRow = { questId: string; userId: string; createdAt: Date };

    const nodeParticipants = await db
      .select({
        questId: nodeTable.questId,
        userId: nodeTable.userId,
        createdAt: nodeTable.createdAt,
      })
      .from(nodeTable)
      .where(inArray(nodeTable.questId, questIds));

    const participantAccumulator = new Map<
      string,
      Map<string, ParticipantRow>
    >();
    const upsertParticipant = (record: ParticipantRow) => {
      const questMap =
        participantAccumulator.get(record.questId) ??
        new Map<string, ParticipantRow>();
      const existing = questMap.get(record.userId);
      if (!existing || existing.createdAt < record.createdAt) {
        questMap.set(record.userId, record);
      }
      participantAccumulator.set(record.questId, questMap);
    };

    nodeParticipants.forEach(upsertParticipant);
    // Treat seekers as participants so their own quests show them first.
    quests.forEach((questRow) => {
      if (!questRow.seekerId) return;
      upsertParticipant({
        questId: questRow.id,
        userId: questRow.seekerId,
        createdAt: questRow.creationDate,
      });
    });

    const participantsByQuest = new Map<
      string,
      { userId: string; createdAt: Date }[]
    >();
    for (const [questId, questMap] of participantAccumulator.entries()) {
      const sorted = [...questMap.values()].sort((a, b) =>
        a.createdAt > b.createdAt ? -1 : 1,
      );
      participantsByQuest.set(questId, sorted);
    }

    // 3b) Compute all parent paths for non-seeker quests in *one* recursive CTE
    const nonSeekerQuestIds = quests
      .filter((q) => q.seekerId !== user.id)
      .map((q) => q.id);

    let parentPaths: Array<typeof nodeTable.$inferSelect & { depth: number }> =
      [];

    if (nonSeekerQuestIds.length > 0) {
      parentPaths = await executeWithDateParsing(
        getAllParentNodesForManyQuests(nonSeekerQuestIds, user.id),
        db,
      );
    }

    // Group parent paths by questId
    const pathsByQuest = new Map<string, (typeof parentPaths)[number][]>();
    for (const n of parentPaths) {
      const arr = pathsByQuest.get(n.questId);
      if (arr) arr.push(n);
      else pathsByQuest.set(n.questId, [n]);
    }

    // Map each non-seeker quest to the user-specific linkId/linkCode for contributor cards.
    const questLinkIdByQuest = new Map<string, string>();
    const linkCodeById = new Map<string, string>();
    if (nonSeekerQuestIds.length > 0) {
      const userNodeLinks = await db
        .select({
          questId: nodeTable.questId,
          viewLinkId: nodeTable.viewLinkId,
        })
        .from(nodeTable)
        .where(
          and(
            eq(nodeTable.userId, user.id),
            inArray(nodeTable.questId, nonSeekerQuestIds),
          ),
        );

      for (const row of userNodeLinks) {
        if (!row.viewLinkId) continue;
        questLinkIdByQuest.set(row.questId, row.viewLinkId);
      }

      if (questLinkIdByQuest.size > 0) {
        const linkIds = [...new Set(questLinkIdByQuest.values())];
        const linkRows = await db
          .select({ id: linkTable.id, linkCode: linkTable.linkCode })
          .from(linkTable)
          .where(inArray(linkTable.id, linkIds));
        linkRows.forEach((row) => linkCodeById.set(row.id, row.linkCode));
      }
    }

    // 4) Build a single Clerk user map for all userIds we’ll display
    const userIdsForProfiles = new Set<string>();

    // from participants (seeker view)
    participantsByQuest.forEach((list) =>
      list.forEach((p) => userIdsForProfiles.add(p.userId)),
    );
    // from parent paths (non-seeker view)
    parentPaths.forEach((n) => userIdsForProfiles.add(n.userId));

    const clerkMap = await getClerkUserMap([...userIdsForProfiles]);

    const cards: QuestCard[] = [];
    for (const rel of pageRelations) {
      const q = questsById.get(rel.questId);
      if (!q) continue;

      const isUserSeeker = q.seekerId === user.id;
      const questLinkId = questLinkIdByQuest.get(q.id);
      const identifier = isUserSeeker
        ? q.id
        : questLinkId
          ? linkCodeById.get(questLinkId)
          : undefined;

      let nodes: Node[] = [];
      if (isUserSeeker) {
        const arr = participantsByQuest.get(q.id) ?? [];
        nodes = arr.map(({ userId, createdAt }) => {
          const u = clerkMap.get(userId);
          return {
            name: u?.fullName || "",
            activityDate: createdAt,
            imageUrl: u?.imageUrl || "",
          };
        });
      } else {
        const path = pathsByQuest.get(q.id) ?? [];
        nodes = path.map((n) => {
          const u = clerkMap.get(n.userId);
          return {
            name: u?.fullName || "",
            activityDate: n.createdAt,
            imageUrl: u?.imageUrl || "",
          };
        });
      }
      nodes = nodes.toSorted((a, b) =>
        a.activityDate > b.activityDate ? 1 : -1,
      );
      cards.push({
        id: identifier,
        title: q.title,
        isUserSeeker,
        rewardAmount: q.rewardAmount,
        questStatus: q.status,
        numberOfLeads: leadCountByQuestId.get(q.id) ?? 0,
        nodes,
        coverMedia: [q.coverPhoto],
        farewellMessage: q.farewellMessage ?? undefined,
        questHealthState: "",
      });
    }

    const nextOffset = hasMore
      ? params.offset + pageRelations.length
      : undefined;
    const result = { items: cards, hasMore, nextOffset };
    return result;
  },
});
