"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  CoverPhoto,
  InsertQuestData,
} from "@/app/(dock)/create_quest/types";
import { getHopeflowDatabase } from "@/db";
import { linkTable, nodeTable, questTable } from "@/db/schema";
import { createApiEndpoint } from "@/helpers/server/create_server_action";
import { currentUserNoThrow } from "@/helpers/server/auth";
import type { CoverPhoto as QuestCoverPhoto, QuestMedia } from "@/db/constants";
import { eq } from "drizzle-orm";

const R2_PUBLIC_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev"
    : "/r2";

const toPublicUrl = (key: string) => {
  const base = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${base}/${cleanKey}`;
};

const guessExtension = (mime: string | undefined) => {
  if (!mime) return "bin";
  const lower = mime.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("png")) return "png";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("gif")) return "gif";
  if (lower.includes("svg")) return "svg";
  if (lower.includes("heic")) return "heic";
  if (lower.includes("bmp")) return "bmp";
  if (lower.includes("avif")) return "avif";
  const [, subtype] = lower.split("/");
  if (subtype?.includes("+")) return subtype.split("+")[0]!;
  return subtype?.replace(/[^a-z0-9]/g, "") || "bin";
};

const uploadArrayBuffer = async (
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | ArrayBufferView,
  contentType: string,
) => {
  const sanitized = key.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  await bucket.put(sanitized, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000" },
  });
  return sanitized;
};

const persistCoverPhoto = async (
  bucket: R2Bucket,
  baseBlobPath: string,
  { content, ...coverPhoto }: CoverPhoto,
): Promise<QuestCoverPhoto | undefined> => {
  const file = content;
  if (!(file instanceof File)) return undefined;
  const mimeType = file.type || "application/octet-stream";
  const key = `${baseBlobPath}/media/${crypto.randomUUID()}.${guessExtension(mimeType)}`;
  const arrayBuffer = await file.arrayBuffer();
  const storedKey = await uploadArrayBuffer(bucket, key, arrayBuffer, mimeType);
  return { ...coverPhoto, url: toPublicUrl(storedKey) };
};

const persistMedia = async (
  bucket: R2Bucket,
  baseBlobPath: string,
  sources: InsertQuestData["media"],
) => {
  if (!sources || sources.length === 0) return undefined;

  const items = await Promise.all(
    sources.map<Promise<QuestMedia | undefined>>(async (media) => {
      if (media.type === "video") {
        if (!media.url) return undefined;
        return {
          type: "video",
          url: media.url,
          alt: media.alt,
          width: media.width,
          height: media.height,
        };
      }

      const file = media.content;
      if (!(file instanceof File)) return undefined;
      const mimeType = file.type || "application/octet-stream";
      const key = `${baseBlobPath}/media/${crypto.randomUUID()}.${guessExtension(mimeType)}`;
      const arrayBuffer = await file.arrayBuffer();
      const storedKey = await uploadArrayBuffer(
        bucket,
        key,
        arrayBuffer,
        mimeType,
      );
      return {
        type: "image",
        url: toPublicUrl(storedKey),
        alt: media.alt,
        width: media.width,
        height: media.height,
      };
    }),
  );

  const filtered = items.filter((item): item is QuestMedia =>
    Boolean(item?.url),
  );
  return filtered.length > 0 ? filtered : undefined;
};

const generateLinkCode = () =>
  crypto.randomUUID().replace(/-/g, "").slice(0, 12);

export const insertQuest = createApiEndpoint({
  uniqueKey: "createQuest::insertQuest",
  type: "mutation",
  handler: async (payload: InsertQuestData) => {
    // No role check here; any authenticated user can create a quest
    const user = await currentUserNoThrow();
    if (!user) throw new Error("Unauthenticated");

    const title = payload.title?.trim();
    const description = payload.description?.trim();
    if (!title) throw new Error("Title is required");
    if (!description) throw new Error("Description is required");

    const { env } = await getCloudflareContext({ async: true });
    const bucket = env.hopeflow;
    if (!bucket) throw new Error("Storage bucket is unavailable");

    const questId = crypto.randomUUID();
    const baseBlobPath = `quests/${questId}`;

    const coverPhoto = await persistCoverPhoto(
      bucket,
      baseBlobPath,
      payload.coverPhoto,
    );
    if (!coverPhoto) throw new Error("Cover photo is required");
    const media = await persistMedia(bucket, baseBlobPath, payload.media);
    const rootNodeId = crypto.randomUUID();
    const viewLinkId = crypto.randomUUID();
    const viewLinkType = "targeted";
    const viewLinkRelationshipStrength = viewLinkType === "targeted" ? 5 : null;

    const db = await getHopeflowDatabase();
    await db.batch([
      db
        .insert(questTable)
        .values({
          id: questId,
          type: payload.type,
          title,
          shareTitle: payload.shareTitle?.trim() || title,
          description,
          rewardAmount: `${
            Number.isFinite(payload.rewardAmount)
              ? Math.max(0, payload.rewardAmount)
              : 0
          }`,
          baseBlobPath,
          creatorId: user.id,
          seekerId: user.id,
          coverPhoto,
          media: media ?? null,
        }),
      db
        .insert(nodeTable)
        .values({
          id: rootNodeId,
          questId,
          seekerId: user.id,
          userId: user.id,
          parentId: null,
        }),
      db
        .insert(linkTable)
        .values({
          id: viewLinkId,
          questId,
          ownerNodeId: rootNodeId,
          type: viewLinkType,
          name: payload.shareTitle?.trim() || title,
          linkCode: generateLinkCode(),
          relationshipStrength: viewLinkRelationshipStrength,
        }),
      db
        .update(nodeTable)
        .set({ viewLinkId })
        .where(eq(nodeTable.id, rootNodeId)),
      db
        .update(questTable)
        .set({ rootNodeId })
        .where(eq(questTable.id, questId)),
    ]);
    return true;
  },
});
