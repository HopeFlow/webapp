import { z } from "zod";
import { LinkMain } from "./main";
import {
  Prefetch,
  publicPage,
  withParamsAndUser,
} from "@/helpers/server/page_component";
import {
  currentUserNoThrow,
  deactivateLinkAndSetJwtToken,
  user2SafeUser,
  withUserData,
} from "@/helpers/server/auth";
import { headers } from "next/headers";
import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import {
  getQuestAndNodesForLinkByLinkCode,
  trackLinkPageView,
} from "../link.server";
import { prefetchReadLinkTimeline } from "@/apiHooks/link/readLinkTimeline";
import { prefetchLinkStatsCard } from "@/apiHooks/link/linkStatsCard";
import { prefetchReadNodes } from "@/apiHooks/link/readNodes";
import AccessRestricted from "./components/accessRestricted";
import { notFound } from "next/navigation";
import QuestOwnerNotice from "./components/questOwnerNotice";
import AlreadyContributorNotice from "./components/alreadyContributorNotice";
import { socialMediaNames } from "@/db/constants";
import type { SocialMediaName } from "./components/ReflowTree";
import ErrorPreparingPage from "./components/ErrorPreparingPage";
const isSocialMediaName = (
  value: unknown,
): value is (typeof socialMediaNames)[number] =>
  typeof value === "string" &&
  (socialMediaNames as readonly string[]).includes(value);

async function ContentsForUser({
  linkCode,
  referer,
  // headers: reqHeaders,
}: { referer?: string; linkCode: string } & { headers: ReadonlyHeaders }) {
  const sanitizedReferer: SocialMediaName = isSocialMediaName(referer)
    ? referer
    : "unknown";
  const { seekerView, link, quest, nodes, accessRestricted } =
    await getQuestAndNodesForLinkByLinkCode(linkCode);
  if (!quest) {
    if (accessRestricted) return <AccessRestricted />;
    else notFound();
  }

  await trackLinkPageView(quest.id, link.id);

  if (link.linkCode !== linkCode) {
    if (seekerView) {
      return <QuestOwnerNotice quest={quest} link={link} />;
    } else {
      return <AlreadyContributorNotice link={link} />;
    }
  }

  // Enrich nodes with user data for inviter avatar chain
  const nodesWithUserNameAndImage = await withUserData(nodes, {
    fullName: "name",
    firstName: "firstName",
    imageUrl: "userImageUrl",
  });

  if (quest.type === "restricted" && link.active) {
    if (!(await deactivateLinkAndSetJwtToken(linkCode)))
      return <ErrorPreparingPage />;
  }

  const currentUser = await currentUserNoThrow();
  const safeUser = currentUser ? user2SafeUser(currentUser) : undefined;
  const seekerUserId = quest.seekerId ?? quest.creatorId;
  const seekerUserData = seekerUserId
    ? (
        await withUserData([{ userId: seekerUserId }], {
          fullName: true,
          imageUrl: "avatarSrc",
        })
      )[0]
    : undefined;
  const seekerName = seekerUserData?.fullName || "";
  const seekerAvatarSrc = seekerUserData?.avatarSrc ?? "";
  const publishDateValue = quest.startDate ?? quest.creationDate ?? new Date();
  const publishDate =
    publishDateValue instanceof Date
      ? publishDateValue
      : new Date(publishDateValue);
  const coverMedia = [
    { ...quest.coverPhoto, type: "image" as "image" | "video" },
    // ...(quest.media || []),
  ];
  // Build a quick lookup so we can climb the inviter chain efficiently. {[nodeId]: node}
  const nodeMap: Map<string, (typeof nodesWithUserNameAndImage)[number]> =
    new Map(
      nodesWithUserNameAndImage
        .filter(
          (
            node,
          ): node is (typeof nodesWithUserNameAndImage)[number] & {
            id: string;
          } => Boolean(node.id),
        )
        .map((node) => [node.id, node]),
    );
  const maxAvatars = 3;
  const ownerNode =
    link.ownerNodeId && nodeMap.size
      ? nodeMap.get(link.ownerNodeId)
      : undefined;
  const inviterTrail: Array<{ name: string; imageUrl?: string | null }> = [];
  const visited = new Set<string>();
  // Walk up ownerNode ancestry (avoiding cycles) to gather inviter avatars.
  let currentNode = ownerNode;
  while (
    currentNode &&
    currentNode.id &&
    !visited.has(currentNode.id) &&
    inviterTrail.length < maxAvatars
  ) {
    const currentName =
      (typeof currentNode.name === "string" && currentNode.name.trim()) ||
      (typeof link.name === "string" && link.name.trim()) ||
      "Contributor";
    inviterTrail.push({
      name: currentName,
      imageUrl: currentNode.userImageUrl ?? null,
    });
    visited.add(currentNode.id);
    if (!currentNode.parentId) break;
    currentNode = nodeMap.get(currentNode.parentId);
  }
  if (!inviterTrail.length) {
    const fallbackName =
      (typeof link.name === "string" && link.name.trim()) || "Contributor";
    inviterTrail.push({ name: fallbackName });
  }
  inviterTrail.reverse();
  const inviterDisplayName =
    inviterTrail[inviterTrail.length - 1]?.name ||
    (typeof link.name === "string" && link.name.trim()) ||
    "Contributor";
  const inviterIsSeeker = Boolean(
    ownerNode?.userId && ownerNode.userId === seekerUserId,
  );
  // Prefer explicit reason/endorsement before falling back to a generic pitch.
  const inviterExplicitCopy =
    (typeof link.reason === "string" && link.reason.trim()) || null;
  const inviter = {
    displayName: inviterDisplayName,
    linkType: link.type as "targeted" | "broadcast",
    sameAsSeeker: inviterIsSeeker,
    description: inviterExplicitCopy,
    avatars: inviterTrail.map(({ name, imageUrl }) => ({
      name,
      imageUrl: imageUrl ?? undefined,
    })),
  };

  return (
    <Prefetch
      actions={[
        prefetchReadLinkTimeline({ linkCode }),
        prefetchLinkStatsCard({ questId: quest.id, linkCode }),
        prefetchReadNodes({ linkCode }),
      ]}
    >
      <LinkMain
        title={quest.title}
        description={quest.description}
        seekerInfo={{ name: seekerName, avatarSrc: seekerAvatarSrc }}
        publishDate={publishDate}
        user={safeUser}
        coverMedia={coverMedia}
        inviter={inviter}
        linkCode={linkCode}
        questId={quest.id}
        referer={sanitizedReferer}
      />
    </Prefetch>
  );
}

function ContentsForRobots() {
  return <h1>HopeFlow Quest View Page</h1>;
}

export default publicPage(
  withParamsAndUser(
    async function LinkPage({ linkCode, referer }) {
      // Allow social media bots like:
      // 'TelegramBot (like TwitterBot)',
      // 'WhatsApp/2.23.20.0',
      // 'Twitterbot/1.0'
      // to view an empty page
      const h = await headers();
      const userAgent = h.get("user-agent") || "";
      if (/^\w{2,12}bot[/\s]/.test(userAgent.toLowerCase())) {
        return <ContentsForRobots />;
      }
      return (
        <ContentsForUser linkCode={linkCode} referer={referer} headers={h} />
      );
    },
    {
      paramsTypeDef: z.object({ linkCode: z.string() }),
      searchParamsTypeDef: z.object({ referer: z.string().optional() }),
    },
  ),
);
