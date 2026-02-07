"use server";

import { getHopeflowDatabase } from "@/db";
import { REALTIME_SERVER_URL } from "../client/constants";
import { currentUserNoThrow, ensureUserHasRole, withUserData } from "./auth";
import { defineServerFunction } from "./define_server_function";
import { createRealtimeJwt } from "./realtime.server";
import type { ChatMessage, Notification } from "../client/realtime";
import {
  chatMessagesTable,
  notificationsTable,
  questHistoryTable,
} from "@/db/schema";
import { updateTypeDef } from "@/db/constants";
import { and, eq, inArray, ne, or } from "drizzle-orm";

const toTimestampString = (value: Date | string | number) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf())
    ? new Date().toISOString()
    : date.toISOString();
};

const toChatMessage = (
  row: typeof chatMessagesTable.$inferSelect,
): ChatMessage => ({
  id: row.id,
  questId: row.questId,
  nodeId: row.nodeId,
  userId: row.userId,
  content: row.content,
  timestamp: toTimestampString(row.timestamp),
  status: row.status,
});

type ChatAck = {
  state: "received" | "displayed";
  messageId?: string | null;
  questId?: string | null;
  nodeId?: string | null;
};

const isChatAck = (value: unknown): value is ChatAck => {
  if (!value || typeof value !== "object") return false;
  const state = (value as { state?: unknown }).state;
  return state === "received" || state === "displayed";
};

type NotificationAck = { state: "received"; notificationId?: string | null };

const isNotificationAck = (value: unknown): value is NotificationAck => {
  if (!value || typeof value !== "object") return false;
  const state = (value as { state?: unknown }).state;
  return state === "received";
};

type NotificationHistory = Pick<
  typeof questHistoryTable.$inferSelect,
  "questId" | "nodeId" | "type"
> & {
  quest?: { title: string | null; rootNodeId: string | null } | null;
  comment?: { nodeId: string } | null;
  proposedAnswer?: { nodeId: string } | null;
};

const getNotificationMessage = (history: NotificationHistory): string => {
  const questTitle = history.quest?.title?.trim();
  const questLabel = questTitle ? `"${questTitle}"` : "Quest";

  switch (history.type) {
    case "commentAdded":
      return `${questLabel}: new comment`;
    case "nodeJoined":
      return `${questLabel}: new contributor joined`;
    case "answerProposed":
      return `${questLabel}: new lead proposed`;
    case "answerAccepted":
      return `${questLabel}: lead accepted`;
    case "questEdited":
      return `${questLabel}: quest updated`;
    case "reflow":
      return `${questLabel}: quest reflowed`;
    case "terminated":
      return `${questLabel}: quest terminated`;
    case "expired":
      return `${questLabel}: quest expired`;
    default:
      return questTitle ? `${questLabel}: update` : "New notification";
  }
};

const getHistoryNodeId = (history: NotificationHistory) =>
  history.nodeId ??
  history.comment?.nodeId ??
  history.proposedAnswer?.nodeId ??
  history.quest?.rootNodeId ??
  null;

type NotificationWithPointers = typeof notificationsTable.$inferSelect & {
  history?: NotificationHistory | null;
  chatMessage?: {
    id: string;
    questId: string;
    nodeId: string;
    quest?: { title: string | null; rootNodeId: string | null } | null;
  } | null;
  message?: string | null;
  url?: string | null;
  questId?: string | null;
  nodeId?: string | null;
};

const toNotification = (row: NotificationWithPointers): Notification => {
  const historyNodeId = row.history ? getHistoryNodeId(row.history) : null;
  const questId =
    row.history?.questId ?? row.chatMessage?.questId ?? row.questId ?? null;
  const nodeId = historyNodeId ?? row.chatMessage?.nodeId ?? row.nodeId ?? null;

  const base = {
    id: row.id,
    status: row.status,
    timestamp: toTimestampString(row.timestamp),
    questId: questId ?? undefined,
    nodeId: nodeId ?? undefined,
  };

  if (row.history) {
    return {
      ...base,
      message: getNotificationMessage(row.history),
      url: historyNodeId
        ? `/chat/${row.history.questId}/${historyNodeId}`
        : `/quest/${row.history.questId}`,
      nodeId: historyNodeId ?? base.nodeId,
    };
  }

  if (row.chatMessage) {
    const questTitle = row.chatMessage.quest?.title?.trim();
    const questLabel = questTitle ? `"${questTitle}"` : "Quest";
    return {
      ...base,
      message: `${questLabel}: new chat message`,
      url: `/chat/${row.chatMessage.questId}/${row.chatMessage.nodeId}`,
    };
  }

  return {
    ...base,
    message: row.message ?? "New notification",
    url: row.url ?? "/notifications",
  };
};

const toDate = (value?: Date | string | number) => {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date() : date;
};

const NOTIFICATION_GRACE_WINDOW_MS = 1500;

const publishRealtimeMessage = defineServerFunction({
  uniqueKey: "realtime::publishMessage",
  // eslint-disable-next-line hopeflow/require-ensure-user-has-role
  handler: async (
    type: string,
    payload: unknown,
    targetUserId?: string,
    user?: Awaited<ReturnType<typeof currentUserNoThrow>>,
  ) => {
    const authenticatedUser = user ?? (await currentUserNoThrow());
    if (!authenticatedUser) throw new Error("Not authenticated");
    const jwt = await createRealtimeJwt({ userId: authenticatedUser.id });
    const result = await fetch(
      `${process.env.NODE_ENV === "development" ? "http" : "https"}://${REALTIME_SERVER_URL}/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          userId: targetUserId ?? authenticatedUser.id,
          type,
          payload,
        }),
      },
    );
    if (!result.ok) {
      throw new Error(
        `Failed to publish realtime message: ${result.status} ${result.statusText}`,
      );
    }
    const resultJson: unknown = await result.json();
    if (
      resultJson &&
      typeof resultJson === "object" &&
      "error" in resultJson &&
      typeof (resultJson as { error?: unknown }).error === "string"
    ) {
      throw new Error(
        `Failed to publish realtime message: ${(resultJson as { error: string }).error}`,
      );
    }
    if (
      !resultJson ||
      typeof resultJson !== "object" ||
      typeof (resultJson as { clientCount?: unknown }).clientCount !==
        "number" ||
      !Array.isArray((resultJson as { results?: unknown }).results)
    ) {
      throw new Error("Failed to publish realtime message: invalid response");
    }
    return resultJson as { clientCount: number; results: unknown[] };
  },
});

export const initializeChatRoom = defineServerFunction({
  uniqueKey: "realtime::initializeChatRoom",
  handler: async (questId: string, nodeId: string) => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const db = await getHopeflowDatabase();
    const quest = await db.query.questTable.findFirst({
      where: (questTable, { eq }) => eq(questTable.id, questId),
    });
    const node = await db.query.nodeTable.findFirst({
      where: (nodeTable, { and, eq }) =>
        and(eq(nodeTable.id, nodeId), eq(nodeTable.questId, questId)),
    });
    if (!quest || !quest.seekerId || !node) {
      throw new Error("Quest or node not found");
    }
    const counterpartUserId =
      user.id === quest.seekerId ? node.userId : quest.seekerId;

    const targetUser = await withUserData(
      { userId: counterpartUserId },
      { firstName: true, fullName: true, imageUrl: true },
    );
    if (!targetUser) {
      throw new Error("Target user not found");
    }
    ensureUserHasRole(
      quest.seekerId,
      [node.userId],
      ["seeker", "contributor"],
      user.id,
      true,
    );

    const pageSize = 100;
    const rows = await db.query.chatMessagesTable.findMany({
      where: (chatMessagesTable, { and, eq }) =>
        and(
          eq(chatMessagesTable.questId, questId),
          eq(chatMessagesTable.nodeId, nodeId),
        ),
      orderBy: (chatMessagesTable, { desc }) => [
        desc(chatMessagesTable.timestamp),
      ],
      limit: pageSize + 1,
    });
    const hasMore = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);

    await db
      .update(chatMessagesTable)
      .set({ status: "read" })
      .where(
        and(
          eq(chatMessagesTable.questId, questId),
          eq(chatMessagesTable.nodeId, nodeId),
          eq(chatMessagesTable.userId, counterpartUserId),
          ne(chatMessagesTable.status, "read"),
        ),
      );

    const notificationIds = (
      await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .leftJoin(
          questHistoryTable,
          eq(questHistoryTable.id, notificationsTable.questHistoryId),
        )
        .leftJoin(
          chatMessagesTable,
          eq(chatMessagesTable.id, notificationsTable.chatMessageId),
        )
        .where(
          and(
            eq(notificationsTable.userId, user.id),
            or(
              and(
                eq(questHistoryTable.questId, questId),
                eq(questHistoryTable.nodeId, nodeId),
              ),
              and(
                eq(chatMessagesTable.questId, questId),
                eq(chatMessagesTable.nodeId, nodeId),
              ),
            ),
            ne(notificationsTable.status, "read"),
          ),
        )
    ).map(({ id }) => id);

    if (notificationIds.length > 0) {
      await db
        .update(notificationsTable)
        .set({ status: "read" })
        .where(inArray(notificationsTable.id, notificationIds));
    }

    const messages = pageRows.map((row) =>
      row.userId === counterpartUserId
        ? toChatMessage({ ...row, status: "read" })
        : toChatMessage(row),
    );
    return {
      currentUserId: user.id,
      currentUserImageUrl: user.imageUrl,
      targetUserImageUrl: targetUser.imageUrl,
      targetUserName: targetUser.firstName ?? targetUser.fullName ?? undefined,
      questTitle: quest.title ?? undefined,
      messages,
      hasMore,
      nextCursor:
        pageRows.length > 0
          ? toTimestampString(pageRows[pageRows.length - 1].timestamp)
          : null,
    };
  },
});

export const fetchChatMessagesBefore = defineServerFunction({
  uniqueKey: "realtime::fetchChatMessagesBefore",
  handler: async (
    questId: string,
    nodeId: string,
    beforeTimestamp: string,
    limit = 100,
  ) => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const db = await getHopeflowDatabase();
    const node = await db.query.nodeTable.findFirst({
      where: (nodeTable, { and, eq }) =>
        and(eq(nodeTable.id, nodeId), eq(nodeTable.questId, questId)),
      with: { quest: { columns: { seekerId: true } } },
    });
    if (!node || !node.quest?.seekerId) {
      throw new Error("Chat not found");
    }
    ensureUserHasRole(
      node.quest.seekerId,
      [node.userId],
      ["seeker", "contributor"],
      user.id,
      true,
    );
    const cursor = new Date(beforeTimestamp);
    if (Number.isNaN(cursor.valueOf())) {
      throw new Error("Invalid cursor timestamp");
    }
    const pageSize = Math.max(1, Math.min(limit, 200));
    const rows = await db.query.chatMessagesTable.findMany({
      where: (chatMessagesTable, { and, eq, lt }) =>
        and(
          eq(chatMessagesTable.questId, questId),
          eq(chatMessagesTable.nodeId, nodeId),
          lt(chatMessagesTable.timestamp, cursor),
        ),
      orderBy: (chatMessagesTable, { desc }) => [
        desc(chatMessagesTable.timestamp),
      ],
      limit: pageSize + 1,
    });
    const hasMore = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);
    const messages = pageRows.map((row) => toChatMessage(row));
    return {
      messages,
      hasMore,
      nextCursor:
        pageRows.length > 0
          ? toTimestampString(pageRows[pageRows.length - 1].timestamp)
          : null,
    };
  },
});

export const sendChatMessage = defineServerFunction({
  uniqueKey: "realtime::sendChatMessage",
  handler: async (
    questId: string,
    nodeId: string,
    content: string,
    id?: string,
  ) => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const db = await getHopeflowDatabase();
    const node = await db.query.nodeTable.findFirst({
      where: (nodeTable, { and, eq }) =>
        and(eq(nodeTable.id, nodeId), eq(nodeTable.questId, questId)),
      with: { quest: { columns: { seekerId: true, title: true } } },
    });
    if (!node || !node.quest || !node.quest.seekerId) {
      throw new Error("Chat not found");
    }
    ensureUserHasRole(
      node.quest.seekerId,
      [node.userId],
      ["seeker", "contributor"],
      user.id,
      true,
    );
    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        id,
        questId,
        nodeId,
        userId: user.id,
        content,
        timestamp: new Date(),
      })
      .returning();

    let chatMessage = toChatMessage(message);
    const targetUserId =
      user.id === node.quest.seekerId ? node.userId : node.quest.seekerId;

    let notificationPayload: Notification | null = null;
    const publishResult = await publishRealtimeMessage(
      "chat_message",
      chatMessage,
      targetUserId ?? undefined,
      user,
    );
    const ackResults = Array.isArray(publishResult.results)
      ? publishResult.results
      : [];
    const chatAcks = ackResults.flatMap((ack) =>
      Array.isArray(ack) ? ack.filter(isChatAck) : isChatAck(ack) ? [ack] : [],
    );
    const acksForMessage = chatAcks.filter(
      (ack) => !ack.messageId || ack.messageId === chatMessage.id,
    );
    const hasDisplayedAck = acksForMessage.some(
      (ack) => ack.state === "displayed",
    );
    const hasReceivedAck =
      hasDisplayedAck || acksForMessage.some((ack) => ack.state === "received");

    if (hasDisplayedAck) {
      await db
        .update(chatMessagesTable)
        .set({ status: "read" })
        .where(eq(chatMessagesTable.id, chatMessage.id));
      chatMessage = { ...chatMessage, status: "read" };
    } else if (hasReceivedAck) {
      await db
        .update(chatMessagesTable)
        .set({ status: "delivered" })
        .where(eq(chatMessagesTable.id, chatMessage.id));
      chatMessage = { ...chatMessage, status: "delivered" };
    } else if (targetUserId) {
      if (NOTIFICATION_GRACE_WINDOW_MS > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, NOTIFICATION_GRACE_WINDOW_MS),
        );
      }
      const refreshed = await db.query.chatMessagesTable.findFirst({
        where: (chatMessagesTable, { eq }) =>
          eq(chatMessagesTable.id, chatMessage.id),
        columns: { status: true },
      });
      if (refreshed?.status && refreshed.status !== "sent") {
        return chatMessage;
      }
      const eventTimestamp = new Date();
      const [notificationRow] = await db
        .insert(notificationsTable)
        .values({
          userId: targetUserId,
          chatMessageId: chatMessage.id,
          timestamp: eventTimestamp,
          status: "sent",
        })
        .returning({ id: notificationsTable.id });
      if (notificationRow) {
        const notification = await db.query.notificationsTable.findFirst({
          where: (notificationsTable, { eq }) =>
            eq(notificationsTable.id, notificationRow.id),
          with: {
            chatMessage: {
              columns: { id: true, questId: true, nodeId: true },
              with: { quest: { columns: { title: true, rootNodeId: true } } },
            },
          },
        });
        if (notification) {
          notificationPayload = toNotification({
            ...notification,
            message: null,
            url: null,
            questId: null,
            nodeId: null,
          });
        }
      }
    }
    if (notificationPayload) {
      const notificationPublishResult = await publishRealtimeMessage(
        "notification",
        notificationPayload,
        targetUserId ?? undefined,
        user,
      );
      const notificationAckResults = Array.isArray(
        notificationPublishResult.results,
      )
        ? notificationPublishResult.results
        : [];
      const notificationAcks = notificationAckResults.flatMap((ack) =>
        Array.isArray(ack)
          ? ack.filter(isNotificationAck)
          : isNotificationAck(ack)
            ? [ack]
            : [],
      );
      const wasDelivered = notificationAcks.some(
        (ack) =>
          !ack.notificationId || ack.notificationId === notificationPayload.id,
      );
      if (wasDelivered) {
        await db
          .update(notificationsTable)
          .set({ status: "delivered" })
          .where(eq(notificationsTable.id, notificationPayload.id));
      }
    }
    return chatMessage;
  },
});

export const sendChatTyping = defineServerFunction({
  uniqueKey: "realtime::sendChatTyping",
  handler: async (questId: string, nodeId: string) => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const db = await getHopeflowDatabase();
    const node = await db.query.nodeTable.findFirst({
      where: (nodeTable, { and, eq }) =>
        and(eq(nodeTable.id, nodeId), eq(nodeTable.questId, questId)),
      with: { quest: { columns: { seekerId: true } } },
    });
    if (!node || !node.quest || !node.quest.seekerId) {
      throw new Error("Chat not found");
    }
    ensureUserHasRole(
      node.quest.seekerId,
      [node.userId],
      ["seeker", "contributor"],
      user.id,
      true,
    );
    const targetUserId =
      user.id === node.quest.seekerId ? node.userId : node.quest.seekerId;
    await publishRealtimeMessage(
      "chat_typing",
      {
        questId,
        nodeId,
        userId: user.id,
        timestamp: toTimestampString(new Date()),
      },
      targetUserId ?? undefined,
      user,
    );
    return true;
  },
});

type NotificationEventType = (typeof updateTypeDef)[number];

type NotificationPointerKey =
  | "linkId"
  | "nodeId"
  | "commentId"
  | "proposedAnswerId";

const notificationPointerByType: Record<
  NotificationEventType,
  NotificationPointerKey | null
> = {
  reflow: "linkId",
  answerProposed: "proposedAnswerId",
  answerAccepted: "proposedAnswerId",
  terminated: null,
  expired: null,
  questEdited: null,
  nodeJoined: "nodeId",
  commentAdded: "commentId",
};

export const initializeNotifications = defineServerFunction({
  uniqueKey: "realtime::initializeNotifications",
  // eslint-disable-next-line hopeflow/require-ensure-user-has-role -- any authenticated user can have notifications
  handler: async () => {
    const user = await currentUserNoThrow();
    if (!user) return null;
    const db = await getHopeflowDatabase();
    const resolvedNotifications = (
      await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .leftJoin(
          chatMessagesTable,
          eq(chatMessagesTable.id, notificationsTable.chatMessageId),
        )
        .where(
          and(
            eq(notificationsTable.userId, user.id),
            ne(notificationsTable.status, "read"),
            eq(chatMessagesTable.status, "read"),
          ),
        )
    ).map(({ id }) => id);

    if (resolvedNotifications.length > 0) {
      await db
        .update(notificationsTable)
        .set({ status: "read" })
        .where(inArray(notificationsTable.id, resolvedNotifications));
    }
    const notifications = (
      await db.query.notificationsTable.findMany({
        where: (notificationsTable, { eq }) =>
          eq(notificationsTable.userId, user.id),
        with: {
          history: {
            columns: {
              id: true,
              type: true,
              questId: true,
              nodeId: true,
              commentId: true,
              proposedAnswerId: true,
            },
            with: {
              quest: { columns: { title: true, rootNodeId: true } },
              comment: { columns: { nodeId: true } },
              proposedAnswer: { columns: { nodeId: true } },
            },
          },
          chatMessage: {
            columns: { id: true, questId: true, nodeId: true },
            with: { quest: { columns: { title: true, rootNodeId: true } } },
          },
        },
        orderBy: (notificationsTable, { desc }) => [
          desc(notificationsTable.timestamp),
        ],
      })
    ).map(toNotification);
    return notifications;
  },
});

export type MarkNotificationsReadParams = { ids: string[] };

export const markNotificationsRead = defineServerFunction({
  uniqueKey: "realtime::markNotificationsRead",
  // eslint-disable-next-line hopeflow/require-ensure-user-has-role -- any authenticated user can mark their notifications
  handler: async (params: MarkNotificationsReadParams) => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const db = await getHopeflowDatabase();

    const notificationIds = params.ids;
    if (notificationIds.length > 0) {
      await db
        .update(notificationsTable)
        .set({ status: "read" })
        .where(
          and(
            inArray(notificationsTable.id, notificationIds),
            eq(notificationsTable.userId, user.id),
          ),
        );
    }
    return true;
  },
});
