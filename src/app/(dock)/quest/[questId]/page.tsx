import z from "zod";
import {
  chatMessagesTable,
  commentTable,
  linkTable,
  nodeTable,
  proposedAnswerTable,
  questTable,
} from "@/db/schema";
import { withUserData } from "@/helpers/server/auth";
import { computeQuestState, type QuestState } from "@/helpers/server/db";
import { getQuestHistoryWithRelations } from "@/app/(nodock)/common/quest_history";
import { desc, eq, inArray } from "drizzle-orm";
import { QuestStarterView, type QuestPageData } from "./starter";
import { withParams } from "@/helpers/server/page_component";
import { notFound } from "next/navigation";
import { getHopeflowDatabase } from "@/db";
import {
  countQuestComments,
  countQuestContributors,
  countQuestLeads,
  countQuestUniqueViews,
} from "@/helpers/server/stats";

// import { QuestContributorView } from "./contributor";

const healthCopyByState: Record<QuestState, string> = {
  Young: "This quest is new. Reflow it now to establish early momentum.",
  Thriving:
    "Great momentum. Keep sharing with high-context contacts to land leads faster.",
  Stable:
    "Progress is steady. A few targeted reflows can push this quest into a breakthrough.",
  Fading:
    "Momentum is cooling. Re-engage your strongest connectors and ask one clear question.",
  Withering:
    "Activity is low. Share again with a fresh angle and a concrete call to action.",
};

export async function getQuestPageData(
  questId: string,
): Promise<QuestPageData | null> {
  const db = await getHopeflowDatabase();
  const quest = await db.query.questTable.findFirst({
    where: eq(questTable.id, questId),
  });
  if (!quest) return null;

  const [nodes, historyWithRelations, latestLeadRows, latestQuestionRows] =
    await Promise.all([
      db.query.nodeTable.findMany({ where: eq(nodeTable.questId, questId) }),
      getQuestHistoryWithRelations(db, questId),
      db.query.proposedAnswerTable.findMany({
        where: eq(proposedAnswerTable.questId, questId),
        orderBy: [desc(proposedAnswerTable.createdAt)],
        limit: 24,
      }),
      db.query.chatMessagesTable.findMany({
        where: eq(chatMessagesTable.questId, questId),
        orderBy: [desc(chatMessagesTable.timestamp)],
        limit: 4,
      }),
    ]);

  const [views, shares, leadsCount, commentsCount, latestComment] =
    await Promise.all([
      countQuestUniqueViews(db, questId),
      countQuestContributors(db, questId),
      countQuestLeads(db, questId),
      countQuestComments(db, questId),
      db.query.commentTable.findFirst({
        where: eq(commentTable.questId, questId),
        orderBy: [desc(commentTable.createdAt)],
      }),
    ]);

  const [
    latestCommentWithUser,
    nodesWithUsers,
    leadsWithUsers,
    questionsWithUsers,
  ] = await Promise.all([
    latestComment
      ? withUserData({ userId: latestComment.userId }, { fullName: "name" })
      : Promise.resolve(null),
    withUserData(nodes, { fullName: "name", imageUrl: true }),
    withUserData(latestLeadRows, { fullName: "name", imageUrl: true }),
    withUserData(latestQuestionRows, { fullName: "name", imageUrl: true }),
  ]);

  const viewLinkIds = nodes
    .map((node) => node.viewLinkId)
    .filter((id): id is string => Boolean(id));
  const uniqueViewLinkIds = [...new Set(viewLinkIds)];
  const viewLinks =
    uniqueViewLinkIds.length > 0
      ? await db
          .select({
            id: linkTable.id,
            relationshipStrength: linkTable.relationshipStrength,
            linkCode: linkTable.linkCode,
            type: linkTable.type,
          })
          .from(linkTable)
          .where(inArray(linkTable.id, uniqueViewLinkIds))
      : [];
  const viewLinkById = new Map(viewLinks.map((link) => [link.id, link]));

  const historyWithActors = await withUserData(
    historyWithRelations.map((entry) => ({
      ...entry,
      userId: entry.history.actorUserId,
    })),
    { fullName: "name", imageUrl: true },
  );

  const rankedLeads = [...leadsWithUsers]
    .sort((a, b) => {
      const aScore =
        (a.status === "accepted" ? 1_000_000_000_000 : 0) +
        new Date(a.decidedAt ?? a.createdAt).valueOf();
      const bScore =
        (b.status === "accepted" ? 1_000_000_000_000 : 0) +
        new Date(b.decidedAt ?? b.createdAt).valueOf();
      return bScore - aScore;
    })
    .slice(0, 4);

  const questHealthState = computeQuestState(
    quest,
    nodes,
    historyWithRelations.map((entry) => entry.history),
  );

  const latestCommenterName = latestCommentWithUser?.fullName ?? null;
  const terminatedAt =
    historyWithRelations.find((entry) => entry.history.type === "terminated")
      ?.history.createdAt ?? null;

  return {
    questId: quest.id,
    questTitle: quest.title,
    rewardAmount: Number(quest.rewardAmount ?? 0),
    latestLeads: rankedLeads.map((lead) => ({
      id: lead.id,
      content: lead.content,
      status: lead.status,
      createdAt: lead.createdAt,
      decidedAt: lead.decidedAt,
      contributor: { name: lead.name, imageUrl: lead.imageUrl },
    })),
    questStatistics: {
      views,
      shares,
      leads: leadsCount,
      comments: commentsCount,
      latestCommenterName,
    },
    questHealth: {
      state: questHealthState,
      text: healthCopyByState[questHealthState],
    },
    latestQuestions: questionsWithUsers.map((message) => ({
      id: message.id,
      content: message.content,
      timestamp: message.timestamp,
      askedBy: { name: message.name, imageUrl: message.imageUrl },
    })),
    questDescription: quest.description,
    questHistory: historyWithActors.map((entry) => ({
      id: entry.history.id,
      type: entry.history.type,
      createdAt: entry.history.createdAt,
      actor: { name: entry.name, imageUrl: entry.imageUrl },
      comment: entry.comment?.content ?? null,
      lead: entry.proposedAnswer?.content ?? null,
      linkId: entry.history.linkId ?? null,
      nodeId: entry.history.nodeId ?? null,
    })),
    shareTreeNodes: nodesWithUsers.map((node) => {
      const edgeLink = node.viewLinkId
        ? viewLinkById.get(node.viewLinkId)
        : null;
      return {
        id: node.id,
        parentId: node.parentId ?? null,
        userId: node.userId,
        user: { name: node.name, imageUrl: node.imageUrl },
        createdAt: node.createdAt,
        referer: node.referer,
        viewLinkId: node.viewLinkId ?? null,
        edgeStrength: edgeLink?.relationshipStrength ?? null,
        edgeLinkCode: edgeLink?.linkCode ?? null,
        edgeType: edgeLink?.type ?? null,
      };
    }),
    terminationStatus: {
      status: quest.status,
      isTerminated: quest.status === "terminated",
      isClosed:
        quest.status === "solved" ||
        quest.status === "terminated" ||
        quest.status === "expired",
      finishedAt: quest.finishedAt,
      terminatedAt: terminatedAt,
      farewellMessage: quest.farewellMessage ?? null,
    },
  };
}

export default withParams(
  async function QuestPage({ questId }: { questId: string }) {
    // TODO: See the following list
    // - Ensure user has required role
    // - Move logic from .data here
    // - Revisit the whole mess

    const questData = await getQuestPageData(questId);
    if (!questData) notFound();

    return (
      <div className="bg-base-200 relative flex-1 overflow-scroll">
        <div className="absolute top-0 left-0 flex w-full flex-col items-center justify-center">
          {/* <QuestContributorView /> */}
          <QuestStarterView questData={questData} />
        </div>
      </div>
    );
  },
  { paramsTypeDef: z.object({ questId: z.string() }) },
);
