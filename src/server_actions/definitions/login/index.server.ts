"use server";
import "server-only";

import { getHopeflowDatabase } from "@/db";
import { defineServerFunction } from "@/helpers/server/define_server_function";

export const isAccountCreated = defineServerFunction({
  id: "isAccountCreated",
  scope: "login",
  handler: async (userId: string) => {
    const db = await getHopeflowDatabase();
    const row = await db.query.userProfileTable.findFirst({
      where: (u, { eq }) => eq(u.userId, userId),
      columns: { userId: true }, // only fetch what you need
    });
    return !!row;
  },
});
