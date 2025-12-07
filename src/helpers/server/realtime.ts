"use server";

import { defineServerFunction } from "./define_server_function";

export const initializeChatRoom = defineServerFunction({
  id: "initializeChatRoom",
  scope: "realtime",
  handler: async (questId: string, recepientUserId: string) => {},
});
