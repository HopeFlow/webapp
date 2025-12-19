"use client";

import { MobileHeader } from "@/components/mobile_header";
import type { SafeUser } from "@/helpers/server/auth";
import {
  LinkEngagement,
  type LinkOverviewMediaItem,
  type LinkInviterInfo,
  type LinkSubmitQuestion,
  type LinkActionLabels,
} from "./components/LinkEngagement";
import {
  LinkMotivatorAccordion,
  LinkRewardAccordion,
} from "./components/LinkAccordions";
import { LinkStoryContent } from "./components/LinkStoryContent";
import type { SocialMediaName } from "./components/ReflowTree";
import { LinkFooterSection } from "./components/LinkFooterSection";
import { LinkTitleSection } from "./components/LinkTitleSection";
import { QuestMedia } from "@/db/constants";
import { LinkTimelineContent } from "./components/LinkTimelineContent";
import { LinkBotonicalTree } from "./components/LinkBotonicalTree";
import { LinkReflowTree } from "./components/LinkReflowTree";
import { LinkMediaCarousel } from "./components/LinkMediaCarousel";
import { StatsCard } from "./components/StatsCard";
import { useLinkStatsCard } from "@/apiHooks/link/linkStatsCard";
import type { LinkStatusStat } from "../types";
import { getReadNodesQueryKey, useReadNodes } from "@/apiHooks/link/readNodes";
import { useGotoLogin } from "@/helpers/client/routes";
import { useAddNode } from "@/apiHooks/link/addNode";
import { useQueryClient } from "@tanstack/react-query";
import type { readNodes } from "../node.api";

const FALLBACK_STATS: LinkStatusStat[] = [
  {
    id: "views",
    icon: "views",
    label: "Views",
    value: "0",
    helper: "people have seen this quest",
  },
  {
    id: "contributors",
    icon: "contributors",
    label: "Contributors",
    value: "0",
    helper: "community members joined",
  },
  {
    id: "leads",
    icon: "leads",
    label: "Leads",
    value: "0",
    helper: "qualified answers submitted",
  },
  {
    id: "comments",
    icon: "comments",
    label: "Comments",
    value: "0",
    helper: "recent check-ins",
  },
];

const SUBMIT_QUESTIONS: LinkSubmitQuestion[] = [
  { question: "Some question", answerRequired: true },
  { question: "Some other question", answerRequired: false },
];

const ACTION_LABELS: LinkActionLabels = {
  reflow: "Reflow",
  submit: "Propose answer",
  bookmark: "Join",
};

type MotivatorAccordionProps = Parameters<typeof LinkMotivatorAccordion>[0];
type RewardAccordionProps = Parameters<typeof LinkRewardAccordion>[0];

// Serialized snapshot of inviter details supplied by the server.
type SerializedInviter = {
  displayName: string;
  linkType: "targeted" | "broadcast";
  sameAsSeeker?: boolean;
  description?: string | null;
  avatars: Array<{
    name: string;
    imageUrl?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  }>;
};

const MOTIVATOR_CONTENT: MotivatorAccordionProps = {
  title: <>🌺 Your action may be crucial</>,
  body: (
    <>
      <p>
        Out of the <b>300</b> individuals who have visited this quest,{" "}
        <b>only 10</b>😢 has taken action. The success of <i>HopeFlow</i> quests
        relies upon word being spread, so that those who hold the answers may be
        reached.
      </p>
      <p>
        <b>Your contribution</b> could be <b>the spark that helps</b>🌱 this
        quest tree flourish and draws forth the ones destined to respond 🌳😊.
      </p>
    </>
  ),
};

const QUEST_REWARD_CONTENT: RewardAccordionProps = {
  title: <>🕊️ Recompense ($425 max.)</>,
  body: (
    <>
      <p>
        <i>$950</i> has been allocated for the quest. If <i>you</i> solve it
        directly, you&apos;ll receive <b>half</b> which is <b>$425</b>.
      </p>
      <p>
        If your pass the word on, rewards then flow through a{" "}
        <b>recursive split 🌀</b>. The solver gets <b>½</b>; the referrer{" "}
        <b>¼</b>, the one before <b>⅛</b>... each step halving. Say you pass to
        your friend, whose aquintance provides the answer, you&apos;ll earn{" "}
        <b>⅛ = $106.25</b>.
      </p>
    </>
  ),
};

type SeekerInfo = { name: string; avatarSrc: string };

export function LinkMain({
  title,
  description,
  seekerInfo,
  publishDate,
  coverMedia,
  user,
  inviter,
  linkCode,
  questId,
  referer,
}: {
  title: string;
  description: string;
  seekerInfo: SeekerInfo;
  publishDate: Date;
  coverMedia: QuestMedia[];
  user?: SafeUser;
  inviter: SerializedInviter;
  linkCode: string;
  questId: string;
  referer: SocialMediaName;
}) {
  // Normalize inviter messaging so the UI always has readable names and copy.
  const inviterName = inviter.displayName?.trim() || "Someone";
  const seekerName = seekerInfo.name?.trim() || "the quest owner";
  const samePerson = inviter.sameAsSeeker;
  const isTargeted = inviter.linkType === "targeted";
  const fallbackDescription = isTargeted
    ? samePerson
      ? `${inviterName} is inviting you directly to lend a hand.`
      : `${inviterName} believes you could help ${seekerName}.`
    : samePerson
      ? `${inviterName} is reaching out broadly for help with this quest.`
      : `${inviterName} is spreading the word to support ${seekerName}.`;
  const inviterDescription = inviter.description?.trim() || fallbackDescription;
  const inviterAvatarsSource = inviter.avatars.length
    ? inviter.avatars
    : [{ name: inviterName }];
  const messageCopy = (() => {
    if (isTargeted) {
      if (samePerson) {
        return <>shares this quest directly with you</>;
      }
      return (
        <>
          shares this with you on behalf of{" "}
          <span className="font-semibold">{seekerName}</span>
        </>
      );
    }
    if (samePerson) {
      return <>is sharing their quest with the community</>;
    }
    return (
      <>
        is amplifying this quest to help{" "}
        <span className="font-semibold">{seekerName}</span>
      </>
    );
  })();
  const inviterInfo: LinkInviterInfo = {
    avatars: inviterAvatarsSource.map(
      ({ name, imageUrl, imageWidth, imageHeight }) => ({
        name: name?.trim() || inviterName,
        imageUrl: imageUrl!,
        imageWidth: imageWidth ?? undefined,
        imageHeight: imageHeight ?? undefined,
      }),
    ),
    message: (
      <>
        <span className="font-semibold">{inviterName}</span> {messageCopy}
      </>
    ),
    description: inviterDescription,
  };

  const coverMediaItems = coverMedia.map<LinkOverviewMediaItem>(
    ({ url, width, height, alt, type }, index) => ({
      id: `cover-media-${index}`,
      src: url,
      width,
      height,
      alt,
      type,
    }),
  );
  const mediaItems = coverMediaItems.length ? coverMediaItems : [];
  const statsQuery = useLinkStatsCard({ questId, linkCode });
  const stats = statsQuery.data?.stats ?? FALLBACK_STATS;
  const redirectUrl = `link/${linkCode}`;

  const { data: linkNodeData, isLoading: isLinkNodeLoading } = useReadNodes({
    linkCode,
  });
  const queryClient = useQueryClient();

  const hasOptimisticNode = (
    node: Awaited<ReturnType<typeof readNodes>>["treeRoot"] | undefined,
  ) => {
    if (!node) return false;
    const queue = [node];
    while (queue.length) {
      const current = queue.shift();
      if (current?.optimistic) return true;
      if (current?.children?.length) {
        queue.push(...current.children);
      }
    }
    return false;
  };

  //
  const createNode = useAddNode({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: getReadNodesQueryKey({ linkCode }),
      });
      const previousNodes = queryClient.getQueryData<
        Awaited<ReturnType<typeof readNodes>>
      >(getReadNodesQueryKey({ linkCode }));
      queryClient.setQueryData<Awaited<ReturnType<typeof readNodes>>>(
        getReadNodesQueryKey({ linkCode }),
        (oldData) => {
          if (!oldData?.treeRoot) return oldData;
          const optimisticId = `optimistic-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
          const viewerName =
            user?.fullName?.trim() ||
            user?.firstName?.trim() ||
            user?.lastName?.trim() ||
            "You";
          const optimisticNode = {
            id: optimisticId,
            title: viewerName,
            createdAt: new Date(),
            imageUrl: user?.imageUrl ?? oldData.userImageUrl,
            referer: variables.referer,
            children: [] as typeof oldData.treeRoot.children,
            targetNode: true,
            potentialNode: false,
            optimistic: true,
          };

          // Walks the tree depth-first, cloning nodes as it goes.
          // - Finds the first placeholder/potential node and replaces it with the optimistic node.
          // - If no placeholder is found, the caller can append at the root.
          // Returns: [updatedNode, didInsertHereOrBelow]
          const injectOptimisticNode = (
            node: typeof oldData.treeRoot,
          ): [typeof oldData.treeRoot, boolean] => {
            let inserted = false;
            const children = node.children.map((child) => {
              if (inserted) return child;
              if (child.potentialNode) {
                inserted = true;
                return { ...optimisticNode };
              }
              const [updatedChild, childInserted] = injectOptimisticNode(child);
              if (childInserted) inserted = true;
              return updatedChild;
            });
            return [{ ...node, children }, inserted];
          };

          const [updatedRoot, inserted] = injectOptimisticNode(
            oldData.treeRoot,
          );
          const treeRoot = inserted
            ? updatedRoot
            : {
                ...oldData.treeRoot,
                children: [...oldData.treeRoot.children, optimisticNode],
              };

          return {
            ...oldData,
            hasJoined: true,
            userImageUrl: optimisticNode.imageUrl ?? oldData.userImageUrl,
            nodeId: undefined,
            treeRoot,
          };
        },
      );
      return { previousNodes };
    },
    onError: (_error, _variables, context) => {
      const previousNodes = (
        context as
          | { previousNodes?: Awaited<ReturnType<typeof readNodes>> }
          | undefined
      )?.previousNodes;
      if (previousNodes) {
        queryClient.setQueryData<Awaited<ReturnType<typeof readNodes>>>(
          getReadNodesQueryKey({ linkCode }),
          previousNodes,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getReadNodesQueryKey({ linkCode }),
      });
    },
  });
  const gotoLogin = useGotoLogin();
  const isJoining =
    createNode.isPending || hasOptimisticNode(linkNodeData?.treeRoot);

  const handlePotentialNodeClick = async () => {
    if (!user) {
      gotoLogin({ url: `/link/${linkCode}` });
      return;
    }
    await createNode.mutateAsync({ referer, linkCode });
  };

  return (
    <div className="flex w-full max-w-6xl flex-col self-center">
      <MobileHeader user={user} url={redirectUrl} />
      <div className="flex flex-col gap-4 p-6 md:gap-6">
        <LinkTitleSection title={title} user={user} url={redirectUrl} />
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <div className="flex flex-col gap-4 md:w-2/3">
            <LinkMediaCarousel mediaItems={mediaItems} />
            <StatsCard stats={stats} />
          </div>
          <LinkEngagement
            inviter={inviterInfo}
            submitQuestions={SUBMIT_QUESTIONS}
            actionLabels={ACTION_LABELS}
            hasJoined={linkNodeData?.hasJoined}
            isJoining={isJoining}
            handleJoin={handlePotentialNodeClick}
            questType={linkNodeData?.questType}
          />
        </div>
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <LinkMotivatorAccordion {...MOTIVATOR_CONTENT} />
          <LinkRewardAccordion {...QUEST_REWARD_CONTENT} />
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          {/* Left stack */}
          <div className="flex min-w-0 flex-col gap-4 md:w-2/3 md:gap-6">
            <LinkStoryContent description={description} />
            <LinkTimelineContent
              linkCode={linkCode}
              user={user}
              referer={referer}
              questId={questId}
            />
          </div>
          {/* right stack */}
          <div className="bg-secondary-content border-secondary card flex flex-1 flex-col border md:sticky md:top-6 md:w-1/3 md:flex-shrink-0 md:self-start">
            <LinkBotonicalTree
              questId={questId}
              treeRoot={linkNodeData?.treeRoot}
              isLoading={isLinkNodeLoading}
            />
            <hr className="border-secondary mx-5 bg-transparent" />
            <LinkReflowTree
              treeRoot={linkNodeData?.treeRoot}
              userImageUrl={linkNodeData?.userImageUrl}
              isLoading={isLinkNodeLoading}
              onPotentialNodeClick={handlePotentialNodeClick}
            />
          </div>
        </div>
        <LinkFooterSection
          name={seekerInfo.name}
          avatarSrc={seekerInfo.avatarSrc}
          date={publishDate}
          questId={questId}
          nodeId={linkNodeData?.nodeId}
        />
      </div>
    </div>
  );
}
