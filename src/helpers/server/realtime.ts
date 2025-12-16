"use server";

import { getHopeflowDatabase } from "@/db";
import { REALTIME_SERVER_URL } from "../client/constants";
import { currentUserNoThrow, ensureUserHasRole } from "./auth";
import { defineServerFunction } from "./define_server_function";
import { createRealtimeJwt } from "./realtime.server";
import type { ChatMessage, Notification } from "../client/realtime";
import {
  chatMessagesTable,
  notificationsTable,
  questHistoryTable,
} from "@/db/schema";
import { updateTypeDef } from "@/db/constants";

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

const toDate = (value?: Date | string | number) => {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date() : date;
};

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
    ensureUserHasRole(
      quest.seekerId,
      [node.userId],
      ["seeker", "contributor"],
      user.id,
      true,
    );

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

export const sendChatMessage = defineServerFunction({
  uniqueKey: "realtime::sendChatMessage",
  handler: async (questId: string, nodeId: string, content: string) => {
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
    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        questId,
        nodeId,
        userId: user.id,
        content,
        timestamp: new Date(),
      })
      .returning();
    const chatMessage = toChatMessage(message);
    await publishRealtimeMessage("chat_message", chatMessage, undefined, user);
    return chatMessage;
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

type SendNotificationParams =
  | {
      recipientUserId: string;
      questHistoryId: string;
      timestamp?: Date | string | number;
      actorUserId?: string;
    }
  | {
      recipientUserId: string;
      questId: string;
      type: NotificationEventType;
      nodeId?: string;
      commentId?: string;
      proposedAnswerId?: string;
      linkId?: string;
      timestamp?: Date | string | number;
      actorUserId?: string;
    };

export const initializeNotifications = defineServerFunction({
  uniqueKey: "realtime::initializeNotifications",
  // eslint-disable-next-line hopeflow/require-ensure-user-has-role -- any authenticated user can have notifications
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

export const sendNotification = defineServerFunction({
  uniqueKey: "realtime::sendNotification",
  // eslint-disable-next-line hopeflow/require-ensure-user-has-role
  handler: async (params: SendNotificationParams) => {
    // TODO: Rethink this
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");

    const actingUserId =
      "actorUserId" in params && params.actorUserId
        ? params.actorUserId
        : user.id;
    const eventTimestamp = toDate(params.timestamp);

    const db = await getHopeflowDatabase();
    let questHistoryId: string;

    if ("questHistoryId" in params) {
      questHistoryId = params.questHistoryId;
    } else {
      const quest = await db.query.questTable.findFirst({
        where: (questTable, { eq }) => eq(questTable.id, params.questId),
        columns: { id: true },
      });
      if (!quest) throw new Error("Quest not found");

      const pointerValues: Record<NotificationPointerKey, string | undefined> =
        {
          linkId: params.linkId,
          nodeId: params.nodeId,
          commentId: params.commentId,
          proposedAnswerId: params.proposedAnswerId,
        };

      const expectedPointer = notificationPointerByType[params.type];
      const providedPointerEntries = Object.entries(pointerValues).filter(
        ([, value]) => value,
      ) as [NotificationPointerKey, string][];

      if (expectedPointer) {
        if (!pointerValues[expectedPointer]) {
          throw new Error(
            `${expectedPointer} is required for notification type "${params.type}"`,
          );
        }
        const extraPointers = providedPointerEntries
          .map(([key]) => key)
          .filter((key) => key !== expectedPointer);
        if (extraPointers.length > 0) {
          throw new Error(
            `Notification type "${params.type}" must only include ${expectedPointer}; received ${extraPointers.join(", ")}`,
          );
        }
      } else if (providedPointerEntries.length > 0) {
        throw new Error(
          `Notification type "${params.type}" does not use linkId, nodeId, commentId, or proposedAnswerId`,
        );
      }

      const historyPointers: Record<
        NotificationPointerKey,
        string | undefined
      > = {
        linkId: undefined,
        nodeId: undefined,
        commentId: undefined,
        proposedAnswerId: undefined,
      };

      if (expectedPointer) {
        historyPointers[expectedPointer] = pointerValues[expectedPointer];
      }

      const [history] = await db
        .insert(questHistoryTable)
        .values({
          questId: params.questId,
          actorUserId: actingUserId,
          type: params.type,
          createdAt: eventTimestamp,
          ...historyPointers,
        })
        .returning({ id: questHistoryTable.id });
      if (!history?.id) throw new Error("Failed to create quest history");
      questHistoryId = history.id;
    }

    const [notificationRow] = await db
      .insert(notificationsTable)
      .values({
        userId: params.recipientUserId,
        questHistoryId,
        timestamp: eventTimestamp,
      })
      .returning({ id: notificationsTable.id });

    if (!notificationRow?.id) throw new Error("Failed to create notification");

    const notification = await db.query.notificationsTable.findFirst({
      where: (notificationsTable, { eq }) =>
        eq(notificationsTable.id, notificationRow.id),
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
    });

    if (!notification) throw new Error("Notification not found");

    const payload = toNotification(notification);

    return publishRealtimeMessage(
      "notification",
      payload,
      params.recipientUserId,
      user,
    );
  },
});
