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

    const rows = await db.query.chatMessagesTable.findMany({
      where: (chatMessagesTable, { and, eq }) =>
        and(
          eq(chatMessagesTable.questId, questId),
          eq(chatMessagesTable.nodeId, nodeId),
        ),
      orderBy: (chatMessagesTable, { desc }) => [
        desc(chatMessagesTable.timestamp),
      ],
      limit: 100,
    });

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

    const messages = rows.map((row) =>
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
      await publishRealtimeMessage(
        "notification",
        notificationPayload,
        targetUserId ?? undefined,
        user,
      );
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
    if (!user) return null;
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
