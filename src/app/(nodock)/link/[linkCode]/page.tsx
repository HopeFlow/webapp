import { z } from "zod";
import { LinkMain } from "./main";
import { publicPage, withParamsAndUser } from "@/helpers/server/page_component";
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
  getWinnerPathsForQuests,
} from "@/server_actions/definitions/link/index.server";
import AccessRestricted from "./components/accessRestricted";
import { notFound } from "next/navigation";
import QuestOwnerNotice from "./components/questOwnerNotice";
import AlreadyContributorNotice from "./components/alreadyContributorNotice";
import { socialMediaNames } from "@/db/constants";
import { elapsedTime2String } from "@/helpers/client/time";
import { ReFlowNodeSimple } from "./components/ReflowTree";
import ErrorPreparingPage from "./components/ErrorPreparingPage";

const isSocialMediaName = (
  value: unknown,
): value is (typeof socialMediaNames)[number] =>
  typeof value === "string" &&
  (socialMediaNames as readonly string[]).includes(value);

async function ContentsForUser({
  linkCode,
  referer,
  headers: reqHeaders,
}: { referer?: string; linkCode: string } & { headers: ReadonlyHeaders }) {
  const {
    seekerView,
    anonymous,
    link,
    quest,
    userNode,
    nodes,
    accessRestricted,
  } = await getQuestAndNodesForLinkByLinkCode(linkCode);
  if (!quest) {
    if (accessRestricted) return <AccessRestricted />;
    else notFound();
  }

  if (link.linkCode !== linkCode) {
    if (seekerView) {
      return <QuestOwnerNotice quest={quest} link={link} />;
    } else {
      return <AlreadyContributorNotice link={link} />;
    }
  }

  const lastNode = nodes.at(-1);
  if (lastNode?.id === "" && isSocialMediaName(referer)) {
    lastNode.referer = referer;
  }

  const nodesWithUserNameAndImage = await withUserData(nodes, {
    fullName: "name",
    firstName: "firstName",
    imageUrl: "userImageUrl",
  });

  nodesWithUserNameAndImage
    // Only adjust display labels for nodes tied to this link and
    // ensure the pending nodes always display a label, defaulting to the link name.
    .filter((n) => n.viewLinkId === link.id)
    .forEach((n) => {
      if (!n.name) {
        n.name = link.name;
      }
    });

  let winnerPathMap: Record<string, number> = {};
  if (quest.status === "solved") {
    const results = await getWinnerPathsForQuests([quest.id]);
    if (results) winnerPathMap = results[quest.id];
  }

  type LinkTreeNodeSource = (typeof nodesWithUserNameAndImage)[number];

  const createNodeTree = (
    nodesForTree: LinkTreeNodeSource[],
  ): ReFlowNodeSimple => {
    // Map a DB node to the shape expected by the tree component.
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
        subtitle: elapsedTime2String(node.createdAt),
        imageUrl: node.userImageUrl || undefined,
        referer: node.parentId !== null ? node.referer : null,
      };

      const rank = hasRealId && node.id ? winnerPathMap[node.id] : null;
      return rank != null ? { ...commonFields, rank } : commonFields;
    };

    // Root node is the only entry without a parent.
    const rootSourceNode = nodesForTree.find((n) => n.parentId === null);

    // Recursively build the nested tree for the UI.
    const buildTree = (sourceNode: LinkTreeNodeSource): ReFlowNodeSimple => ({
      ...toTreeNode(sourceNode),
      children: nodesForTree
        .filter((candidate) => candidate.parentId === sourceNode.id)
        .map((child) => buildTree(child)),
    });

    return buildTree(rootSourceNode!);
  };

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
    <LinkMain
      title={quest.title}
      description={quest.description}
      seekerInfo={{ name: seekerName, avatarSrc: seekerAvatarSrc }}
      publishDate={publishDate}
      // nodeId={userNode?.id}
      // description={description}
      // linkCode={linkCode}
      // needsLogin={Boolean(anonymous)}
      user={safeUser}
      // needsDeactivating={quest.type === "restricted" && Boolean(link.active)}
      // questId={quest.id}
      coverMedia={coverMedia}
      inviter={inviter}
      // rewardAmount={quest.rewardAmount}
      // coverYTVideoUrl={quest.coverYTVideoUrl}
      // starterView={starterView}
      // referer={referer}
      reflowTreeRoot={createNodeTree(nodesWithUserNameAndImage)}
      // questStatus={quest.status}
    />
  );
}

function ContentsForRobots() {
  return <h1>HopeFlow Quest View Page</h1>;
}

export default publicPage(
  withParamsAndUser(
    async function LinkPage({ linkCode, user, referer }) {
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
        // <AccessRestricted />
      );
    },
    {
      paramsTypeDef: z.object({ linkCode: z.string() }),
      searchParamsTypeDef: z.object({ referer: z.string().optional() }),
    },
  ),
);
