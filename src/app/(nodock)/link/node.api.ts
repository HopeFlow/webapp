"use server";

import { getHopeflowDatabase } from "@/db";
import { nodeTable, questHistoryTable } from "@/db/schema";
import { currentUserNoThrow, withUserData } from "@/helpers/server/auth";
import { linkTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { prepareUserNode } from "./timeline.api";
import { SocialMediaName } from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";
import {
  getQuestAndNodesForLinkByLinkCode,
  getWinnerPathsForQuests,
} from "./link.server";
import { ReFlowNodeSimple } from "@/app/(nodock)/link/[linkCode]/components/ReflowTree";
import { createApiEndpoint } from "@/helpers/server/create_server_action";

export const readNodes = createApiEndpoint({
  uniqueKey: "link::readNodes",
  type: "query",
  handler: async ({ linkCode }: { linkCode: string }) => {
    const context = await getQuestAndNodesForLinkByLinkCode(linkCode);

    if (
      !("nodes" in context) ||
      !context.nodes ||
      !context.link ||
      !context.quest
    ) {
      throw new Error("Failed to load quest data");
    }

    const { nodes, link, quest, userNode } = context;

    // Enrich nodes with user data
    const nodesWithUserNameAndImage = await withUserData(nodes, {
      fullName: "name",
      firstName: "firstName",
      imageUrl: "userImageUrl",
    });

    type LinkTreeNodeSource = (typeof nodesWithUserNameAndImage)[number];

    // Adjust display labels for nodes tied to this link
    nodesWithUserNameAndImage
      .filter((n: LinkTreeNodeSource) => n.viewLinkId === link.id)
      .forEach((n: LinkTreeNodeSource) => {
        if (!n.name) {
          n.name = link.name;
        }
      });

    // Get winner paths if quest is solved
    let winnerPathMap: Record<string, number> = {};
    if (quest.status === "solved") {
      const results = await getWinnerPathsForQuests([quest.id]);
      if (results) winnerPathMap = results[quest.id];
    }

    // Build the tree structure
    const createNodeTree = (
      nodesForTree: LinkTreeNodeSource[],
    ): ReFlowNodeSimple => {
      const toTreeNode = (
        node: LinkTreeNodeSource,
      ): Omit<ReFlowNodeSimple, "children"> => {
        const rawId =
          typeof node.id === "string" && node.id.trim() ? node.id.trim() : "";
        const resolvedId =
          rawId ||
          (node.viewLinkId ? `link-${node.viewLinkId}` : undefined) ||
          `pending-${node.parentId ?? "root"}-${Number(
            new Date(node.createdAt),
          )}`;
        const hasRealId = Boolean(rawId);
        const commonFields = {
          id: resolvedId,
          title: node.name || undefined,
          targetNode: (hasRealId && node.id === userNode?.id) || !hasRealId,
          potentialNode: !hasRealId,
          createdAt: node.createdAt,
          imageUrl: node.userImageUrl || undefined,
          referer: node.parentId !== null ? node.referer : null,
        };

        const rank = hasRealId && node.id ? winnerPathMap[node.id] : null;
        return rank != null ? { ...commonFields, rank } : commonFields;
      };

      const rootSourceNode = nodesForTree.find((n) => n.parentId === null);

      const buildTree = (sourceNode: LinkTreeNodeSource): ReFlowNodeSimple => ({
        ...toTreeNode(sourceNode),
        children: nodesForTree
          .filter((candidate) => candidate.parentId === sourceNode.id)
          .map((child) => buildTree(child)),
      });

      return buildTree(rootSourceNode!);
    };

    const treeRoot = createNodeTree(nodesWithUserNameAndImage);

    // Get current user's image URL if they're logged in
    const viewer = await currentUserNoThrow();
    const userImageUrl = viewer?.imageUrl;

    return {
      treeRoot,
      userImageUrl,
      hasJoined: !!userNode,
      questType: quest.type,
    };
  },
});

export const addNode = createApiEndpoint({
  uniqueKey: "link::addNode",
  type: "mutation",
  handler: async (linkCode: string, referer: SocialMediaName) => {
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
