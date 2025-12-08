"use server";

import { getHopeflowDatabase } from "@/db";
import { REALTIME_SERVER_URL } from "../client/constants";
import { currentUserNoThrow } from "./auth";
import { defineServerFunction } from "./define_server_function";
import { createRealtimeJwt } from "./realtime.server";

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
    const messages = await (
      await getHopeflowDatabase()
    ).query.chatMessagesTable.findMany({
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
    return publishRealtimeMessage("chat_init", messages, user.id, user);
  },
});

export const initializeNotifications = defineServerFunction({
  uniqueKey: "realtime::initializeNotifications",
  handler: async () => {
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Not authenticated");
    const notifications = await (
      await getHopeflowDatabase()
    ).query.notificationsTable.findMany({
      where: (notificationsTable, { eq }) =>
        eq(notificationsTable.userId, user.id),
    });
    return publishRealtimeMessage(
      "notifications_init",
      notifications,
      user.id,
      user,
    );
  },
});
