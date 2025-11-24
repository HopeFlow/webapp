"use server";

import { getHopeflowDatabase } from "@/db";
import { nodeTable, questHistoryTable } from "@/db/schema";
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

    const { nodeId, pendingInsert } = await prepareUserNode({
      db,
      link,
      userId: viewer.id,
      referer,
    });

    if (pendingInsert) {
      const nodeInsert = db.insert(nodeTable).values(pendingInsert);
      const historyInsert = db
        .insert(questHistoryTable)
        .values({
          questId: link.questId,
          actorUserId: viewer.id,
          type: "nodeJoined",
          createdAt: new Date(),
          nodeId,
          linkId: link.id,
        });
      await db.batch([nodeInsert, historyInsert]);
    }

    return true;
  },
});

linkNode.addInvalidation(linkTimeline);
