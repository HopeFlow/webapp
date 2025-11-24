"use server";

import { getHopeflowDatabase } from "@/db";
import { nodeTable } from "@/db/schema";
import { currentUserNoThrow } from "@/helpers/server/auth";
import { createCrudServerAction } from "@/helpers/server/create_server_action";
import { linkTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { prepareUserNode } from "./timeline";
import { linkTimeline } from "./timeline";
import { SocialMediaName } from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";

export const linkNode = createCrudServerAction<
  { referer: SocialMediaName },
  never,
  never,
  never,
  [{ linkCode: string }]
>({
  id: "linkNode",
  scope: "link",
  create: async ({ referer }, { linkCode }) => {
    const viewer = await currentUserNoThrow();
    if (!viewer) throw new Error("Please sign in to join the quest");

    const db = await getHopeflowDatabase();
    const link = await db.query.linkTable.findFirst({
      where: eq(linkTable.linkCode, linkCode),
    });
    if (!link) throw new Error("Link not found");

    const { pendingInsert } = await prepareUserNode({
      db,
      link,
      userId: viewer.id,
      referer,
    });

    if (pendingInsert) {
      await db.insert(nodeTable).values(pendingInsert);
    }

    return true;
  },
});

linkNode.addInvalidation(linkTimeline);
