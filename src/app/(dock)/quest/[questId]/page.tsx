import z from "zod";
import {
  chatMessagesTable,
  commentTable,
  linkTable,
  nodeTable,
  proposedAnswerTable,
  questHistoryTable,
  questTable,
} from "@/db/schema";
import { ensureUserHasRole, withUserData } from "@/helpers/server/auth";
import { computeQuestState, type QuestState } from "@/helpers/server/db";
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

const healthCopyByState = (
  quest: typeof questTable.$inferSelect,
  state: QuestState,
  statistics: QuestPageData["questStatistics"],
) => {
  // TODO: Actually use the statistics to make copies more intimate
  void statistics;
  const copyByStateMap: Record<QuestState, string> = {
    Young:
      "The quest is realtively new. Your contribution can have a big impact in getting it off the ground.",
    Thriving:
      "Thing have great momentum. This has happenned because people like you got involved early.",
    Stable:
      "Progress is steady. Contribute to make the engine go full throttle.",
    Fading:
      "We are loosing momentum :( Contribute to give it a boost and get it back on track.",
    Withering:
      "The quest is struggling to stay alive. Your contribution can be the one that saves it.",
  };
  return copyByStateMap[state];
};

export async function getQuestPageData(
  db: Awaited<ReturnType<typeof getHopeflowDatabase>>,
  quest: typeof questTable.$inferSelect,
): Promise<QuestPageData | null> {
  if (!quest) return null;
  const questId = quest.id;
  const [nodes, history, latestLeadRows, latestQuestionRows] =
    await Promise.all([
      db.query.nodeTable.findMany({ where: eq(nodeTable.questId, questId) }),
      db.query.questHistoryTable.findMany({
        where: eq(questHistoryTable.questId, questId),
        orderBy: [desc(questHistoryTable.createdAt)],
        with: { comment: true, proposedAnswer: true },
      }),
      db.query.proposedAnswerTable.findMany({
        where: eq(proposedAnswerTable.questId, questId),
        orderBy: [desc(proposedAnswerTable.createdAt)],
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
      ? withUserData(
          { userId: latestComment.userId },
          { fullName: "name", imageUrl: true },
        )
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
    history.map((entry) => ({ ...entry, userId: entry.actorUserId })),
    { fullName: "name", imageUrl: true },
  );

  const rankedLeads = [...leadsWithUsers]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const questHealthState = computeQuestState(quest, nodes, history);

  const latestCommenterName = latestCommentWithUser?.fullName ?? null;
  const terminatedAt =
    history.find((entry) => entry.type === "terminated")?.createdAt ?? null;

  const latestLeads = rankedLeads.map((lead) => ({
    id: lead.id,
    content: lead.content,
    status: lead.status,
    createdAt: lead.createdAt,
    decidedAt: lead.decidedAt,
    contributor: { name: lead.name, imageUrl: lead.imageUrl },
  }));
  const questStatistics = {
    views,
    shares,
    leads: leadsCount,
    comments: commentsCount,
    latestCommenterName,
  };

  return {
    questId: quest.id,
    questTitle: quest.title,
    rewardAmount: Number(quest.rewardAmount ?? 0),
    latestLeads,
    questStatistics,
    questHealth: {
      state: questHealthState,
      text: healthCopyByState(quest, questHealthState, questStatistics),
    },
    latestQuestions: questionsWithUsers.map((message) => ({
      id: message.id,
      content: message.content,
      timestamp: message.timestamp,
      askedBy: { name: message.name, imageUrl: message.imageUrl },
    })),
    questDescription: quest.description,
    questHistory: historyWithActors.map((entry) => ({
      id: entry.id,
      type: entry.type,
      createdAt: entry.createdAt,
      actor: { name: entry.name, imageUrl: entry.imageUrl },
      comment: entry.comment?.content ?? null,
      lead: entry.proposedAnswer?.content ?? null,
      linkId: entry.linkId ?? null,
      nodeId: entry.nodeId ?? null,
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
    const db = await getHopeflowDatabase();
    const quest = await db.query.questTable.findFirst({
      where: eq(questTable.id, questId),
    });

    if (!quest) notFound();

    // TODO: Handle draft more properly
    if (!quest.seekerId) notFound();

    ensureUserHasRole(quest.seekerId, [], ["seeker"]);

    const questData = await getQuestPageData(db, quest);
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
