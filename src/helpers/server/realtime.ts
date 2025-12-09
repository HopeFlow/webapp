"use server";

import { getHopeflowDatabase } from "@/db";
import { REALTIME_SERVER_URL } from "../client/constants";
import { currentUserNoThrow } from "./auth";
import { defineServerFunction } from "./define_server_function";
import { createRealtimeJwt } from "./realtime.server";
import type { ChatMessage, Notification } from "../client/realtime";
import type {
  chatMessagesTable,
  notificationsTable,
  questHistoryTable,
} from "@/db/schema";

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
});

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
    case "answerRejected":
      return `${questLabel}: lead rejected`;
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

type NotificationWithHistory = Omit<
  typeof notificationsTable.$inferSelect,
  "questHistoryId" | "timestamp"
> & { timestamp: Date | string | number; history: NotificationHistory | null };

const toNotification = (row: NotificationWithHistory): Notification => {
  const base = {
    id: row.id,
    status: row.status,
    timestamp: toTimestampString(row.timestamp),
  };

  if (!row.history) {
    return { ...base, message: "New notification", url: "/notifications" };
  }

  const nodeId = getHistoryNodeId(row.history);
  return {
    ...base,
    message: getNotificationMessage(row.history),
    url: nodeId
      ? `/chat/${row.history.questId}/${nodeId}`
      : `/quest/${row.history.questId}`,
  };
};

const publishRealtimeMessage = defineServerFunction({
  uniqueKey: "realtime::publishMessage",
  handler: async (
    type: string,
    payload: unknown,
    targetUserId?: string,
    user?: Awaited<ReturnType<typeof currentUserNoThrow>>,
  ) => {
    const authenticatedUser = user ?? (await currentUserNoThrow());
    if (!authenticatedUser) throw new Error("Not authenticated");
    const jwt = await createRealtimeJwt({ userId: authenticatedUser.id });
    const result = await fetch(`https://${REALTIME_SERVER_URL}/publish`, {
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
    });
    if (!result.ok) {
      throw new Error(
        `Failed to publish realtime message: ${result.status} ${result.statusText}`,
      );
    }
    const resultJson: object = await result.json();
    if ("error" in resultJson) {
      throw new Error(
        `Failed to publish realtime message: ${resultJson.error}`,
      );
    }
    return resultJson as { delivered: number; attempted: number };
  },
});

export const initializeChatRoom = defineServerFunction({
  uniqueKey: "realtime::initializeChatRoom",
  handler: async (questId: string, nodeId: string) => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const db = await getHopeflowDatabase();
    const messages = (
      await db.query.chatMessagesTable.findMany({
        where: (chatMessagesTable, { and, eq }) =>
          and(
            eq(chatMessagesTable.questId, questId),
            eq(chatMessagesTable.nodeId, nodeId),
          ),
        orderBy: (chatMessagesTable, { desc }) => [
          desc(chatMessagesTable.timestamp),
        ],
        limit: 100,
      })
    ).map(toChatMessage);
    return publishRealtimeMessage(
      "chat_messages_init",
      messages,
      user.id,
      user,
    );
  },
});

export const initializeNotifications = defineServerFunction({
  uniqueKey: "realtime::initializeNotifications",
  handler: async () => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const db = await getHopeflowDatabase();
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
        },
      })
    ).map(toNotification);
    return publishRealtimeMessage(
      "notifications_init",
      notifications,
      user.id,
      user,
    );
  },
});
