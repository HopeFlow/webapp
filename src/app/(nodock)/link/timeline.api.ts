"use server";

import { getHopeflowDatabase } from "@/db";
import {
  commentTable,
  linkTable,
  nodeTable,
  questHistoryTable,
  questTable,
} from "@/db/schema";
import {
  currentUserNoThrow,
  verifyLinkJwtToken,
  withUserData,
} from "@/helpers/server/auth";
import {
  LinkTimelineCreateInput,
  LinkTimelineReactionInput,
  LinkTimelineReadParams,
  LinkTimelineReadResult,
  LinkTimelineRecord,
} from "./types";
import { getQuestAndNodesForLinkByLinkCode } from "./link.server";
import type { QuestHistoryWithRelations } from "../common/quest_history";
import { and, eq } from "drizzle-orm";
import { SocialMediaName } from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";
import { createApiEndpoint } from "@/helpers/server/create_api_endpoint";

type HistoryEntryWithActor = QuestHistoryWithRelations & {
  actorName?: string | null;
  actorFirstName?: string | null;
  actorImageUrl?: string | null;
};

type NodeWithUserMetadata = typeof nodeTable.$inferSelect & {
  fullName?: string | null;
  firstName?: string | null;
  userImageUrl?: string | null;
};

type LinkContextWithHistory = {
  link: typeof linkTable.$inferSelect;
  nodes: (typeof nodeTable.$inferSelect)[];
  userNode?: typeof nodeTable.$inferSelect;
  history: QuestHistoryWithRelations[];
};

type HopeflowDb = Awaited<ReturnType<typeof getHopeflowDatabase>>;

type PreparedNodeResult = {
  nodeId: string;
  pendingInsert?: typeof nodeTable.$inferInsert;
};

export const prepareUserNode = async ({
  db,
  link,
  userId,
  referer,
}: {
  db: HopeflowDb;
  link: typeof linkTable.$inferSelect;
  userId: string;
  referer: SocialMediaName;
}): Promise<PreparedNodeResult> => {
  const existingNode = await db.query.nodeTable.findFirst({
    where: and(
      eq(nodeTable.questId, link.questId),
      eq(nodeTable.userId, userId),
    ),
  });
  if (existingNode) return { nodeId: existingNode.id };

  const quest = await db.query.questTable.findFirst({
    columns: { seekerId: true, creatorId: true },
    where: eq(questTable.id, link.questId),
  });
  if (!quest) throw new Error("Quest not found");

  const seekerId = quest.seekerId ?? quest.creatorId;
  if (!seekerId) throw new Error("Quest is missing the seeker information");

  const nodeId = crypto.randomUUID();
  return {
    nodeId,
    pendingInsert: {
      id: nodeId,
      questId: link.questId,
      seekerId,
      userId,
      parentId: link.ownerNodeId,
      createdAt: new Date(),
      viewLinkId: link.id,
      referer,
    },
  };
};

const getTrimmedStringProperty = <K extends string>(
  source: unknown,
  key: K,
): string | null => {
  if (
    source &&
    typeof source === "object" &&
    key in source &&
    typeof (source as Record<K, unknown>)[key] === "string"
  ) {
    const value = ((source as Record<K, string>)[key] ?? "").trim();
    return value ? value : null;
  }
  return null;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch (error) {
      console.error("Failed to parse JSON array", error);
      return [];
    }
  }
  if (typeof value === "object" && value !== null) {
    return [];
  }
  return [];
};

const buildTimelineRecords = ({
  historyEntries,
  link,
  nodes,
  viewerUserId,
}: {
  historyEntries: HistoryEntryWithActor[];
  link: typeof linkTable.$inferSelect;
  nodes: NodeWithUserMetadata[];
  viewerUserId?: string | null;
}): LinkTimelineRecord[] => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const historyLinkMap = new Map<string, typeof linkTable.$inferSelect>();
  const historyNodeMap = new Map<string, typeof nodeTable.$inferSelect>();

  for (const entry of historyEntries) {
    if (entry.link?.id) historyLinkMap.set(entry.link.id, entry.link);
    if (entry.node?.id) historyNodeMap.set(entry.node.id, entry.node);
  }

  historyLinkMap.set(link.id, link);

  const actions: LinkTimelineRecord[] = [];
  const viewerId = viewerUserId ?? null;

  for (const entry of historyEntries) {
    const timestamp =
      entry.history.createdAt instanceof Date
        ? entry.history.createdAt
        : new Date(entry.history.createdAt);
    if (Number.isNaN(timestamp.valueOf())) continue;

    if (
      entry.history.type === "nodeJoined" &&
      !entry.history.linkId &&
      typeof entry.node?.viewLinkId === "string"
    ) {
      entry.history.linkId = entry.node.viewLinkId;
    }

    const name =
      (typeof entry.actorName === "string" && entry.actorName.trim()) ||
      (typeof entry.actorFirstName === "string" &&
        entry.actorFirstName.trim()) ||
      "Someone";
    const imageUrl =
      typeof entry.actorImageUrl === "string" ? entry.actorImageUrl : undefined;

    const base: Omit<LinkTimelineRecord, "type"> & {
      type?: LinkTimelineRecord["type"];
    } = {
      id: entry.history.id,
      name,
      imageUrl,
      timestamp: timestamp.toISOString(),
      description: undefined,
    };

    let record: LinkTimelineRecord | null = null;

    switch (entry.history.type) {
      case "commentAdded": {
        const likedBy = toStringArray(entry.comment?.likedBy);
        const dislikedBy = toStringArray(entry.comment?.dislikedBy);
        const viewerReaction = viewerId
          ? likedBy.includes(viewerId)
            ? "like"
            : dislikedBy.includes(viewerId)
              ? "dislike"
              : null
          : null;
        record = {
          ...base,
          type: "commented on the quest",
          description: entry.comment?.content ?? undefined,
          comment: entry.comment
            ? {
                id: entry.comment.id,
                content: entry.comment.content,
                likeCount: likedBy.length,
                dislikeCount: dislikedBy.length,
                viewerReaction,
              }
            : undefined,
        };
        break;
      }
      case "reflow": {
        const reason =
          typeof entry.link?.reason === "string"
            ? entry.link.reason.trim()
            : "";
        record = {
          ...base,
          type: "reflowed the quest",
          description:
            `${base.name} created a new ${link.type} link ${link.type === "broadcast" ? `(${entry.link?.linkCode})` : ""} ${reason ? `Here is why: ${reason}` : ""}`.trim(),
        };
        break;
      }
      case "nodeJoined": {
        const started = !entry.node?.parentId;
        if (started) {
          record = { ...base, type: "started the quest" };
          break;
        }
        const parentId = entry.node?.parentId;
        const parentNode =
          (parentId ? nodeMap.get(parentId) : undefined) ??
          (parentId ? historyNodeMap.get(parentId) : undefined);
        const parentName =
          getTrimmedStringProperty(parentNode, "fullName") ??
          getTrimmedStringProperty(parentNode, "firstName") ??
          "Someone";
        const parentLinkId =
          entry.history.linkId ??
          (parentNode &&
          typeof parentNode === "object" &&
          "viewLinkId" in parentNode
            ? ((parentNode as { viewLinkId: string | null }).viewLinkId ?? null)
            : null);
        const parentLink = parentLinkId
          ? (historyLinkMap.get(parentLinkId) ??
            (parentLinkId === link.id ? link : undefined))
          : undefined;
        const rawLinkName =
          typeof parentLink?.name === "string" ? parentLink.name.trim() : "";
        const linkName = rawLinkName || parentLink?.linkCode || link.linkCode;
        const parentLinkType = parentLink?.type ?? link.type;
        record = {
          ...base,
          type: "joined the quest",
          description: `Joined the quest via ${parentName} ${parentLinkType} link (${linkName})`,
        };
        break;
      }
      case "answerProposed": {
        record = {
          ...base,
          type: "presented a lead",
          description: entry.proposedAnswer?.content ?? undefined,
        };
        break;
      }
      case "answerAccepted": {
        record = {
          ...base,
          type: "presented a lead",
          description: entry.proposedAnswer?.content
            ? `Accepted: ${entry.proposedAnswer.content}`
            : "Lead accepted",
        };
        break;
      }
      case "questEdited": {
        record = {
          ...base,
          type: "reflowed the quest",
          description: "Quest details updated",
        };
        break;
      }
      case "terminated": {
        record = {
          ...base,
          type: "reflowed the quest",
          description: "Quest marked as terminated",
        };
        break;
      }
      case "expired": {
        record = {
          ...base,
          type: "reflowed the quest",
          description: "Quest expired",
        };
        break;
      }
      default:
        record = null;
    }

    if (record) {
      actions.push(record);
    }
  }

  actions.sort((a, b) =>
    a.timestamp === b.timestamp
      ? 0
      : new Date(a.timestamp).valueOf() - new Date(b.timestamp).valueOf(),
  );
  return actions;
};

export const readLinkTimeline = createApiEndpoint({
  uniqueKey: "link::readLinkTimeline",
  type: "query",
  handler: async ({ linkCode }: LinkTimelineReadParams) => {
    const viewer = await currentUserNoThrow();
    const context = await getQuestAndNodesForLinkByLinkCode(linkCode);

    if (
      !("history" in context) ||
      !context.history ||
      !context.nodes ||
      !context.link
    ) {
      return { actions: [] };
    }

    const contextWithHistory = context as LinkContextWithHistory;

    const nodesWithMetadata = (await withUserData(contextWithHistory.nodes, {
      fullName: "fullName",
      firstName: "firstName",
      imageUrl: "userImageUrl",
    })) as NodeWithUserMetadata[];

    const historyEntriesWithActor = (await withUserData(
      contextWithHistory.history.map((entry) => ({
        ...entry,
        userId: entry.history.actorUserId,
      })),
      {
        fullName: "actorName",
        firstName: "actorFirstName",
        imageUrl: "actorImageUrl",
      },
    )) as HistoryEntryWithActor[];

    const actions = buildTimelineRecords({
      historyEntries: historyEntriesWithActor,
      link: contextWithHistory.link,
      nodes: nodesWithMetadata,
      viewerUserId: viewer?.id ?? null,
    });

    return { actions } satisfies LinkTimelineReadResult;
  },
});

export const addLinkTimelineComment = createApiEndpoint({
  uniqueKey: "link::addLinkTimelineComment",
  type: "mutation",
  handler: async ({ content, referer, linkCode }: LinkTimelineCreateInput) => {
    const viewer = await currentUserNoThrow();
    if (!viewer) throw new Error("Please sign in to leave a comment");
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Comment cannot be empty");

    const db = await getHopeflowDatabase();
    const link = await db.query.linkTable.findFirst({
      where: eq(linkTable.linkCode, linkCode),
    });
    if (!link) throw new Error("Link not found");
    if (link.type === "targeted") {
      const hasAccess = await verifyLinkJwtToken(link);
      if (!hasAccess) throw new Error("Access to this link is restricted");
    }

    const { nodeId, pendingInsert } = await prepareUserNode({
      db,
      link,
      userId: viewer.id,
      referer,
    });

    const now = new Date();
    const commentId = crypto.randomUUID();
    const commentInsert = db
      .insert(commentTable)
      .values({
        id: commentId,
        questId: link.questId,
        nodeId,
        userId: viewer.id,
        likedBy: [] as string[],
        dislikedBy: [] as string[],
        content: trimmed,
        createdAt: now,
      });
    const historyInsert = db
      .insert(questHistoryTable)
      .values({
        questId: link.questId,
        actorUserId: viewer.id,
        type: "commentAdded",
        createdAt: now,
        commentId,
        nodeId,
      });

    if (pendingInsert) {
      const nodeInsert = db.insert(nodeTable).values(pendingInsert);
      await db.batch([nodeInsert, commentInsert, historyInsert]);
    } else {
      await db.batch([commentInsert, historyInsert]);
    }
    return true;
  },
});

export const reactToLinkTimelineComment = createApiEndpoint({
  uniqueKey: "link::reactToLinkTimelineComment",
  type: "mutation",
  handler: async ({
    commentId,
    reaction,
    referer,
    linkCode,
  }: LinkTimelineReactionInput) => {
    const viewer = await currentUserNoThrow();
    if (!viewer) throw new Error("Please sign in to react to comments");

    const db = await getHopeflowDatabase();

    const [comment, link] = await Promise.all([
      db.query.commentTable.findFirst({
        where: eq(commentTable.id, commentId),
      }),
      db.query.linkTable.findFirst({ where: eq(linkTable.linkCode, linkCode) }),
    ]);
    if (!link) throw new Error("Link not found");
    if (link.type === "targeted") {
      const hasAccess = await verifyLinkJwtToken(link);
      if (!hasAccess) throw new Error("Access to this link is restricted");
    }

    if (!comment) throw new Error("Comment not found");
    if (comment.questId !== link.questId)
      throw new Error("Mismatch between comment and quest");

    const { pendingInsert } = await prepareUserNode({
      db,
      link,
      userId: viewer.id,
      referer,
    });

    const likedBy = toStringArray(comment.likedBy);
    const dislikedBy = toStringArray(comment.dislikedBy);

    const filteredLikes = likedBy.filter((id) => id !== viewer.id);
    const filteredDislikes = dislikedBy.filter((id) => id !== viewer.id);

    if (reaction === "like") {
      filteredLikes.push(viewer.id);
    } else if (reaction === "dislike") {
      filteredDislikes.push(viewer.id);
    }

    const commentUpdate = db
      .update(commentTable)
      .set({ likedBy: filteredLikes, dislikedBy: filteredDislikes })
      .where(eq(commentTable.id, commentId));

    if (pendingInsert) {
      const nodeInsert = db.insert(nodeTable).values(pendingInsert);
      await db.batch([nodeInsert, commentUpdate]);
    } else {
      await db.batch([commentUpdate]);
    }

    return true;
  },
});
