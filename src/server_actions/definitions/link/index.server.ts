"use server";
import { getHopeflowDatabase } from "@/db";
import {
  linkTable,
  nodeTable,
  proposedAnswerTable,
  questViewTable,
  questTable,
} from "@/db/schema";
import { currentUserNoThrow, verifyLinkJwtToken } from "@/helpers/server/auth";
import { executeWithDateParsing } from "@/helpers/server/db";
import { defineServerFunction } from "@/helpers/server/define_server_function";
import { and, eq, inArray, SQL, sql } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1/driver";
import "server-only";
import {
  getQuestHistoryWithRelations,
  type QuestHistoryWithRelations,
} from "../common/quest_history";
import { headers } from "next/headers";

type HeaderSource = { get(name: string): string | null };

const BOT_HINTS = [
  "bot",
  "spider",
  "crawl",
  "slurp",
  "monitor",
  "headless",
  "phantomjs",
  "axios",
  "curl",
  "wget",
] as const;

function stripPort(s: string): string {
  // 1.2.3.4:1234 -> 1.2.3.4, [2001:db8::1]:443 -> 2001:db8::1
  if (s.startsWith("[")) {
    const end = s.indexOf("]");
    return end > 0 ? s.slice(1, end) : s;
  }
  const colon = s.indexOf(":");
  // If it's IPv6 it will have many colons; only strip when it's clearly IPv4:port
  return colon !== -1 && s.indexOf(":") === s.lastIndexOf(":")
    ? s.slice(0, colon)
    : s;
}

function isIpv4(ip: string): boolean {
  // simple, permissive IPv4 check
  const m = ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!m) return false;
  return ip.split(".").every((oct) => {
    const n = Number(oct);
    return (
      n >= 0 &&
      n <= 255 &&
      String(n) === oct.replace(/^0+(?=\d)/, n === 0 ? "0" : String(n))
    ); // avoid 01
  });
}

function isIpv6(ip: string): boolean {
  // basic IPv6 presence (compressed ok). We don’t fully validate every edge, just enough for filtering.
  // Exclude bracketed forms; those are stripped earlier.
  if (ip.includes(" ")) return false;
  if (ip === "") return false;
  // must contain at least one colon
  if (!ip.includes(":")) return false;
  // Disallow multiple ':::' sequences
  if (ip.includes(":::")) return false;
  return true;
}

function normalizeIpv4Mapped(ip: string): string {
  // ::ffff:127.0.0.1 -> 127.0.0.1
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (isIpv4(v4)) return v4;
  }
  return ip;
}

function isIp(ip: string): boolean {
  return isIpv4(ip) || isIpv6(ip);
}

function isPrivateIp(ip: string): boolean {
  if (isIpv4(ip)) return isPrivateIpv4(ip);
  // IPv6 private / special ranges
  const lower = ip.toLowerCase();
  return (
    lower === "::1" || // loopback
    lower.startsWith("fc") ||
    lower.startsWith("fd") || // fc00::/7 unique local
    lower.startsWith("fe80:") ||
    lower.startsWith("fe90:") ||
    lower.startsWith("fea0:") ||
    lower.startsWith("feb0:") // fe80::/10 link-local
  );
}

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8 loopback
  if (a === 127) return true;
  // 169.254.0.0/16 link-local
  if (a === 169 && b === 254) return true;
  return false;
}

function getClientIpFromHeaders(
  reqHeaders: HeaderSource | null,
  opts: { allowPrivate?: boolean } = {},
): string | null {
  if (!reqHeaders) return null;
  const allowPrivate = opts.allowPrivate ?? false;

  const xff = reqHeaders.get("x-forwarded-for");
  const candidates = [
    reqHeaders.get("cf-connecting-ip"),
    reqHeaders.get("true-client-ip"),
    reqHeaders.get("x-real-ip"),
    ...(xff ? xff.split(",") : []),
  ]
    .filter(Boolean)
    .map((s) => stripPort(s!.trim()))
    .map(normalizeIpv4Mapped);

  for (const ip of candidates) {
    if (!isIp(ip)) continue;
    if (allowPrivate || !isPrivateIp(ip)) return ip;
  }
  return null;
}

const anonymizeIp = (ip: string | null): string => {
  if (!ip) return "ip:unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":").slice(0, 3).join(":");
    return `v6:${parts}`;
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return "ip:unknown";
  return `v4:${parts[0]}.${parts[1]}.${parts[2]}.0`;
};

const isLikelyBot = (reqHeaders: HeaderSource | null): boolean => {
  if (!reqHeaders) return false;
  const cfVerifiedBot = reqHeaders.get("cf-verified-bot");
  if (cfVerifiedBot === "true") return true;

  const cfScore = reqHeaders.get("cf-bot-score");
  if (cfScore && Number(cfScore) <= 29) return true;

  const ua = (reqHeaders.get("user-agent") || "").toLowerCase();
  if (!ua) return true;

  if (BOT_HINTS.some((hint) => ua.includes(hint))) return true;
  if (ua.includes("rendertron") || ua.includes("facebookexternalhit"))
    return true;

  return false;
};

export const trackLinkPageView = defineServerFunction({
  id: "trackLinkPageView",
  scope: "link",
  handler: async function (questId: string, linkId: string): Promise<boolean> {
    if (!questId || !linkId) return false;
    try {
      const headerList = await headers();
      if (isLikelyBot(headerList)) return false;

      const db = await getHopeflowDatabase();
      const user = await currentUserNoThrow();
      const clientIpFromHeaders = getClientIpFromHeaders(headerList);
      const ipPrefix = !!clientIpFromHeaders
        ? anonymizeIp(clientIpFromHeaders)
        : "ip:unknown";
      console.log("ipPrefix", ipPrefix);
      const userAgent = headerList.get("user-agent") || "ua:unknown";

      await db
        .insert(questViewTable)
        .values({
          questId,
          linkId,
          userId: user?.id ?? null,
          ipPrefix,
          userAgent,
        });

      return true;
    } catch (error) {
      console.error("trackLinkPageView failed", error);
      return false;
    }
  },
});

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
        WHERE n."${sql.raw(nodeTable.id.name)}" = u."${sql.raw(nodeTable.parentId.name)}"
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
        WHERE n."${sql.raw(nodeTable.parentId.name)}" = d."${sql.raw(nodeTable.id.name)}"
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
function getUserBranchSql(questId: SQL, userId: SQL) {
  return sql`
    ${userBranchCtes(questId, userId, { up: true, down: true })}
    SELECT * FROM (
      SELECT * FROM upward
      UNION
      SELECT * FROM user_node
      UNION
      SELECT * FROM downward
    ) branch
    ORDER BY depth
  `;
}

export type NodeWithPendingLinks = typeof nodeTable.$inferSelect & {
  pendingLinks: (typeof linkTable.$inferSelect)[] | null;
};

/**
 * Fetches the entire “branch” of nodes for a given quest and user
 * (ancestors, the user’s own node, and descendants), and for each node:
 *   – if depth < 0 (ancestors), `links` is set to null
 *   – otherwise, `links` is a JSON array of any Link rows owned by that node
 *     that have not been claimed as a viewLink by another node.
 * The subquery SELECT count(*) FROM node WHERE node.viewLinkId = l.id counts
 * how many nodes are using that link as their viewLinkId. The condition < 1 ensures
 * that only links with zero claimers are included—i.e., unclaimed.
 *
 * All date/time columns are automatically parsed into JS `Date` objects.
 *
 * @param queryId – the quest ID to filter on
 * @param userId  – the user ID whose branch you want
 * @returns a promise resolving to an array of NodeWithLinks, ordered by depth
 *
 * @example
 * // If quest "q1" and user "u1" have:
 * //   • one parent at depth -1 (no links)
 * //   • the user’s own node at depth 0 with two unclaimed links
 * //   • one child at depth +1 with one unclaimed link
 * //
 * // Calling:
 * const branch = await getUserBranchWithLinks("q1", "u1");
 * //
 * // branch === [
 * //   { id: parentId,    depth: -1, pendingLinks: null, … },
 * //   { id: userNodeId,  depth:  0, pendingLinks: [ { … }, { … } ], … },
 * //   { id: childNodeId, depth: +1, pendingLinks: [ { … } ], … },
 * // ]
 */
async function getUserBranchWithPendingLinks(
  queryId: string,
  userId: string,
  db: DrizzleD1Database<Record<string, unknown>>,
) {
  return await executeWithDateParsing<NodeWithPendingLinks>(
    sql`
SELECT
  n.*,
  CASE WHEN n.depth < 0 THEN
    null
  ELSE
    (SELECT json_agg(row_to_json(l)) FROM ${linkTable} l WHERE l."${sql.raw(
      linkTable.ownerNodeId.name,
    )}" = n."${sql.raw(nodeTable.id.name)}" AND (SELECT count(*) FROM ${nodeTable} WHERE ${
      nodeTable.viewLinkId
    } = l."${sql.raw(linkTable.id.name)}") < 1)
  END as pendingLinks
FROM (${getUserBranchSql(sql`${queryId}`, sql`${userId}`)}) n
`,
    db,
  );
}

/**
 * Retrieves a quest and its related nodes for a given shareable link code,
 * handling different access scenarios:
 *  - Starter view: the quest owner viewing their own quest via a contributor link
 *  - Public view: any user accessing a public quest
 *  - Targeted/private view: contributors only, optionally using a JWT link
 *  - Access restricted: when a private link is consumed or invalid
 *
 * @param linkCode - The shareable code tied to a Link record
 * @param preview  - If true, bypasses user authentication (for preview mode)
 * @returns An object containing:
 *   - link: the Link record (if accessible)
 *   - quest: the Quest record
 *   - nodes: array of Node records in the viewer’s branch or entire quest
 *   - userNode: the viewer’s own Node (if any)
 *   - starterView: true when the quest owner is previewing as a contributor
 *   - anonymous: true when no user is logged in
 *   - accessRestricted: true when private access is denied
 */
export const getQuestAndNodesForLinkByLinkCode = defineServerFunction({
  id: "getQuestAndNodesForLinkByLinkCode",
  scope: "link",
  handler: async function (
    linkCode: string,
    preview?: boolean,
  ): Promise<
    | {
        // seeker view
        seekerView: true; // when the seeker of the quest is viewing the quest using (view as contributor) link
        anonymous: false; // When the user is not logged in
        link: typeof linkTable.$inferSelect;
        quest: typeof questTable.$inferSelect;
        userNode: typeof nodeTable.$inferSelect;
        nodes: (typeof nodeTable.$inferSelect)[];
        history: QuestHistoryWithRelations[];
        accessRestricted?: false; // When the quest is private and the link is already consumed by another user
      }
    | {
        // Public view or targeted view
        seekerView?: false;
        anonymous?: boolean;
        link: typeof linkTable.$inferSelect;
        quest: typeof questTable.$inferSelect;
        userNode?: typeof nodeTable.$inferSelect;
        nodes: (typeof nodeTable.$inferSelect)[];
        history: QuestHistoryWithRelations[];
        accessRestricted?: false;
      }
    | {
        // Access restricted
        seekerView?: false;
        anonymous?: undefined;
        link?: undefined;
        quest?: undefined;
        userNode?: undefined;
        nodes?: undefined;
        history?: undefined;
        accessRestricted?: boolean; // true
      }
  > {
    const db = await getHopeflowDatabase();
    const linkEntry = await db.query.linkTable.findFirst({
      where: eq(linkTable.linkCode, linkCode),
    });
    if (!linkEntry) return {};
    const questEntry = await db.query.questTable.findFirst({
      where: eq(questTable.id, linkEntry.questId),
    });
    if (!questEntry) {
      console.error(
        `getQuestAndNodesForLinkByLinkCode: link(${linkEntry.id}) associated to non-existent quest(${linkEntry.questId})`,
      );
      return {};
    }
    // Quest is draft so the links should not work
    if (questEntry.status === "draft") {
      return {};
    }
    const user = preview ? null : await currentUserNoThrow();
    let questHistoryCache: QuestHistoryWithRelations[] | null = null;
    const getQuestHistory = async () => {
      if (!questHistoryCache) {
        questHistoryCache = await getQuestHistoryWithRelations(
          db,
          questEntry.id,
        );
      }
      return questHistoryCache;
    };
    if (user && questEntry.seekerId === user.id) {
      // Seeker view
      const questNodeEntries = await db.query.nodeTable.findMany({
        where: eq(nodeTable.questId, questEntry.id),
      });
      const seekerNode = questNodeEntries.find(
        (questNode) => questNode.id === questEntry.rootNodeId,
      );
      if (!seekerNode) {
        console.error(
          `getQuestAndNodesForLinkByLinkCode: quest(${questEntry.id}) with non-existing root node(${questEntry.rootNodeId})`,
        );
        return {};
      }
      const seekerViewLinkEntry = await (async () => {
        if (linkEntry.id === seekerNode.viewLinkId) return linkEntry;
        if (seekerNode.viewLinkId)
          return await db.query.linkTable.findFirst({
            where: eq(linkTable.id, seekerNode.viewLinkId),
          });
        return undefined;
      })();
      if (!seekerViewLinkEntry) {
        console.error(
          `getQuestAndNodesForLinkByLinkCode: quest(${questEntry.id}) with root node(${questEntry.rootNodeId}) and non-existing view link(${seekerNode.viewLinkId})`,
        );
        return {};
      }
      return {
        seekerView: true,
        anonymous: false,
        link: seekerViewLinkEntry,
        quest: questEntry,
        userNode: seekerNode,
        nodes: questNodeEntries,
        history: await getQuestHistory(),
      };
    }
    const emptyNode: typeof nodeTable.$inferSelect = {
      id: "",
      parentId: linkEntry.ownerNodeId,
      questId: questEntry.id,
      referer: "unknown",
      createdAt: new Date(),
      seekerId: questEntry.seekerId!,
      userId: "",
      viewLinkId: linkEntry.id,
    };
    if (questEntry.type === "unrestricted") {
      const questNodeEntries = await db.query.nodeTable.findMany({
        where: eq(nodeTable.questId, questEntry.id),
      });
      const userNode = user
        ? questNodeEntries.find((questNode) => questNode.userId === user.id)
        : undefined;
      const contributionNode = userNode ? [] : [emptyNode];
      return {
        anonymous: !user,
        link: linkEntry,
        quest: questEntry,
        userNode,
        nodes: [...questNodeEntries, ...contributionNode],
        history: await getQuestHistory(),
      };
    }
    // "Restricted"
    const getUserBranch = async (userId: string) =>
      (await getUserBranchWithPendingLinks(questEntry.id, userId, db)).flatMap(
        ({ pendingLinks, ...node }) => [
          node,
          ...(pendingLinks
            ? // if links exists, it maps each link to a synthetic “placeholder” node that looks like a node
              // [ realNode, placeholderFromLink1, placeholderFromLink2, ... ]
              pendingLinks.map((linkItem) => ({
                ...emptyNode,
                viewLinkId: linkItem.id,
                createdAt: linkItem.createdAt,
                parentId: linkItem.ownerNodeId,
              }))
            : []),
        ],
      );
    if (user) {
      const userBranch = await getUserBranch(user.id);
      const userNode = userBranch.find((n) => n.userId === user.id);
      if (userNode) {
        // Because the user might be opening the quest using someone else’s link (e.g., a parent’s invite). For a personalized view we want the link that belongs to the user’s node
        const correctLinkEntryForUser = await (async () => {
          // Prefer to show the link attached to that node (userNode.viewLinkId), not necessarily the link used to enter (linkEntry)
          if (linkEntry.id === userNode.viewLinkId) return linkEntry;
          if (userNode.viewLinkId)
            return await db.query.linkTable.findFirst({
              where: eq(linkTable.id, userNode.viewLinkId),
            });
          return undefined;
        })();
        if (!correctLinkEntryForUser) {
          console.error(
            `getQuestAndNodesForLinkByLinkCode: node(${userNode.id}) with non-existing view link(${userNode.viewLinkId}))`,
          );
          return {
            anonymous: false,
            link: linkEntry, // fall back to the incoming link
            quest: questEntry,
            userNode,
            nodes: userBranch,
            history: await getQuestHistory(),
          };
        }
        // happy path
        return {
          anonymous: false,
          link: correctLinkEntryForUser, // the user’s own view link
          quest: questEntry,
          userNode,
          nodes: userBranch,
          history: await getQuestHistory(),
        };
      }
    }
    if (!preview && !linkEntry.active && !(await verifyLinkJwtToken(linkEntry)))
      return { accessRestricted: true };

    // If a visitor follows an invite but doesn’t yet have a node in this quest, the most relevant context is the part of the tree around the inviter (the link owner).
    const parentNode = await db.query.nodeTable.findFirst({
      where: eq(nodeTable.id, linkEntry.ownerNodeId),
    });
    if (!parentNode) {
      console.error(
        `getQuestAndNodesForLinkByLinkCode: link(${linkEntry.id}) with non-existing owner node(${linkEntry.ownerNodeId}))`,
      );
      return {};
    }
    const parentBranch = await getUserBranch(parentNode.userId);
    return {
      anonymous: !user,
      link: linkEntry,
      quest: questEntry,
      nodes: parentBranch,
      history: await getQuestHistory(),
    };
  },
});

function winnerAncestorPathSql(winnerNodeId: SQL) {
  return sql`
    WITH RECURSIVE ancestor_chain AS (
      SELECT id, "${sql.raw(nodeTable.parentId.name)}", 1 AS rank
        FROM ${nodeTable}
       WHERE id = ${winnerNodeId}
      UNION
      SELECT n.id, n."${sql.raw(nodeTable.parentId.name)}", ac.rank + 1
        FROM ancestor_chain ac
        JOIN ${nodeTable} n ON n.id = ac."${sql.raw(nodeTable.parentId.name)}"
    )
    SELECT id, rank FROM ancestor_chain
  `;
}

// Helper: fetch winner nodes for multiple quests and build a map questId → (nodeId → rank)
export async function getWinnerPathsForQuests(
  questIds: string[],
): Promise<Record<string, Record<string, number>>> {
  const db = await getHopeflowDatabase();
  if (!questIds.length) return {};

  // 1. Fetch all accepted proposed answers so we can highlight their paths
  const acceptedAnswers = await db.query.proposedAnswerTable.findMany({
    columns: { nodeId: true, questId: true },
    where: and(
      eq(proposedAnswerTable.status, "accepted"),
      inArray(proposedAnswerTable.questId, questIds),
    ),
  });

  const result: Record<string, Record<string, number>> = {};
  if (!acceptedAnswers.length) return result;

  // 2. For each winner node, fetch its ancestor path with ranks
  await Promise.all(
    acceptedAnswers.map(async ({ nodeId: winnerId, questId }) => {
      if (!winnerId) return;
      const rows: Array<{ id: string; rank: number }> =
        await executeWithDateParsing(
          winnerAncestorPathSql(sql`${winnerId}`),
          db,
        );
      if (rows && rows.length) {
        const pathMap: Record<string, number> = {};
        for (const { id, rank } of rows) {
          pathMap[id] = rank;
        }
        result[questId] = pathMap;
      }
    }),
  );

  return result;
}
