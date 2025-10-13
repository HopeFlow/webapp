/*
 * Migration script: Postgres (old schema) -> SQLite (new schema)
 * Run: ts-node drizzle-migrate-old-to-new.ts --dry-run (or --execute)
 * Env:
 *   OLD_DB_URL=postgres://user:pass@host:port/dbname
 *   NEW_DB_PATH=./new.sqlite
 * Notes:
 * - Preserves original UUIDs
 * - Inserts in dependency-safe phases with PRAGMA foreign_keys OFF during load
 * - Uses placeholders to satisfy CHECKs (e.g., 16:9 coverPhoto)
 */

// pnpx ts-node --project tsconfig.json scripts/drizzle-migrate-old-to-new.ts --execute

import dotenv from "dotenv";
dotenv.config();
// import yargs from "yargs";
// import { hideBin } from "yargs/helpers";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { Client as PgClient } from "pg";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

// === Old schema table shapes (minimal, typed as any where convenient) ===
// You can replace these with your generated drizzle types if available.

type SerializedEditorState = any;

type OldQuest = {
  id: string;
  type: "targeted" | "public";
  category: string;
  purpose: string;
  title: string;
  description: SerializedEditorState; // Lexical JSON
  coverPhotoUrl: string | null;
  coverYTVideoUrl: string | null;
  rewardAmount: string; // numeric
  baseBlobPath: string;
  creationDate: string; // timestamptz
  creatorId: string;
  startDate: string | null;
  starterId: string | null; // -> seekerId
  dueDate: string | null;
  status: "draft" | "active" | "finished" | "terminated";
  terminationReason: string | null; // -> farewellMessage
  secretQuestions: Array<{ question: string; answer: string }> | null;
  rootNodeId: string | null;
};

type OldNode = {
  id: string;
  questId: string;
  starterId: string; // -> seekerId on node
  userId: string;
  referer:
    | "facebook"
    | "instagram"
    | "twitter"
    | "linkedin"
    | "pinterest"
    | "tiktok"
    | "reddit"
    | "snapchat"
    | "telegram"
    | "whatsapp"
    | "unknown";
  status: "contributed" | "accepted" | "rejected";
  parentId: string | null;
  viewLinkId: string | null;
  creationDate: string; // timestamptz
};

type OldLink = {
  id: string;
  questId: string;
  ownerNodeId: string;
  name: string | null;
  reason: string | null;
  linkCode: string;
  active: boolean | null;
  creationDate: string; // timestamptz
};

type OldChat = {
  id: string;
  questId: string;
  nodeId: string;
  contributorId: string; // -> userId
  sentBy: "bot" | "starter" | "contributor";
  content: string;
  timestamp: string; // timestamptz
  status: "sent" | "delivered" | "read";
};

type OldUserProfile = {
  userId: string;
  emailEnabled: number | boolean; // boolean
  emailFrequency: "immediate" | "daily" | "weekly";
  lastSentAt: string | null; // timestamptz
  timezone: string | null;
};

// === New schema minimal insert shapes ===

type NewQuest = {
  id: string;
  type: "restricted" | "unrestricted";
  title: string;
  shareTitle: string | null;
  description: string; // plaintext
  rewardAmount: string;
  baseBlobPath: string;
  creationDate: number;
  creatorId: string;
  startDate: number | null;
  seekerId: string | null;
  status: "draft" | "active" | "solved" | "terminated" | "expired";
  farewellMessage: string | null;
  coverPhoto: string; // JSON string
  media: string | null; // JSON array string
  screeningQuestions: string | null; // JSON array string
  reshareLabel: string | null;
  proposeAnswerLabel: string | null;
  saveForLaterLabel: string | null;
  lastContributionAt: number | null;
  finishedAt: number | null;
  rootNodeId: string | null;
};

type NewNode = {
  id: string;
  questId: string;
  seekerId: string; // from old.starterId
  userId: string;
  referer: OldNode["referer"];
  status:
    | "started"
    | "askedQuestion"
    | "reacted"
    | "commented"
    | "mediated"
    | "proposedAnswer"
    | "isAccepted"
    | "isRejected";
  parentId: string | null;
  viewLinkId: string | null; // set in phase 3
  createdAt: number;
};

type NewLink = {
  id: string;
  questId: string;
  ownerNodeId: string;
  type: "targeted" | "broadcast";
  name: string | null;
  endorsement: string | null;
  reason: string | null;
  relationshipStrength: number | null; // left null unless targeted with value
  linkCode: string;
  active: number | null; // boolean int
  createdAt: number;
};

type NewChat = {
  id: string;
  questId: string;
  nodeId: string;
  userId: string;
  content: string;
  timestamp: number;
  status: "sent" | "delivered" | "read";
};

type NewUserProfile = {
  userId: string;
  emailEnabled: number; // boolean int
  credence: string; // numeric as string
  emailFrequency: "immediate" | "daily" | "weekly";
  lastSentAt: number | null;
  timezone: string;
  asciiName: string;
};

// === Helpers ===
// const argv = yargs(hideBin(process.argv))
//   .option("dry-run", { type: "boolean", default: true })
//   .option("execute", { type: "boolean", default: false })
//   .conflicts("dry-run", "execute")
//   .parseSync();

// const DRY_RUN = argv.execute ? false : argv.dryRun;
const DRY_RUN = !process.argv.includes("--execute");

const OLD_DB_URL = process.env.OLD_DB_URL!;
const NEW_DB_PATH = process.env.NEW_DB_PATH || "./new.sqlite";

if (!OLD_DB_URL) {
  console.error("Missing OLD_DB_URL");
  process.exit(1);
}

const toTs = (d: Date | null | undefined) => (d ? d.getTime() : 0);

// Mappings from answers
const mapQuestType = (t: OldQuest["type"]): NewQuest["type"] =>
  t === "targeted" ? "restricted" : "unrestricted";

const mapQuestStatus = (old: OldQuest, now: Date): NewQuest["status"] => {
  if (old.status === "finished") return "solved";
  if (old.status === "terminated") return "terminated";
  if (old.status === "draft") return "draft";
  // active
  if (old.dueDate && new Date(old.dueDate) < now) return "expired";
  return "active";
};

const mapNodeStatus = (s: OldNode["status"]): NewNode["status"] => {
  switch (s) {
    case "contributed":
      return "mediated";
    case "accepted":
      return "isAccepted";
    case "rejected":
      return "isRejected";
  }
};

// Very light Lexical -> plaintext fallback
function lexicalToPlainText(json: any): string {
  try {
    if (typeof json === "string") json = JSON.parse(json);
    // naive walk for "text" fields
    const texts: string[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (typeof n === "object") {
        if (typeof n.text === "string") texts.push(n.text);
        Object.values(n).forEach(walk);
      }
    };
    walk(json);
    const out = texts.join(" ").replace(/\s+/g, " ").trim();
    return out || JSON.stringify(json);
  } catch {
    return typeof json === "string" ? json : JSON.stringify(json);
  }
}

const placeholderCover = (title: string, url?: string | null) =>
  JSON.stringify({
    url: url || "",
    width: 1600,
    height: 900,
    alt: title || "",
  });

const mediaArray = (coverUrl: string | null, ytUrl: string | null) => {
  const arr: Array<{
    url: string;
    width: number;
    height: number;
    alt: string;
    type: "image" | "video";
  }> = [];
  if (coverUrl)
    arr.push({
      url: coverUrl,
      width: 1600,
      height: 900,
      alt: "cover",
      type: "image",
    });
  if (ytUrl)
    arr.push({ url: ytUrl, width: 0, height: 0, alt: "video", type: "video" });
  return arr.length ? JSON.stringify(arr) : null;
};

const mapScreeningQuestions = (sq: OldQuest["secretQuestions"] | null) => {
  if (!sq || !sq.length) return null;
  const mapped = sq.map((q) => ({
    question: q.question,
    answerRequired: false,
    answer: q.answer,
  }));
  return JSON.stringify(mapped);
};

async function main() {
  const now = new Date();

  // Clients
  const pg = new PgClient({ connectionString: OLD_DB_URL });
  await pg.connect();
  const oldDb = drizzlePg(pg);

  const sqlite = new Database(NEW_DB_PATH);
  const newDb = drizzleSqlite(sqlite);

  // Turn off FK checks during staged load
  sqlite.pragma("foreign_keys = OFF");

  // === LOAD old data ===
  const oldQuests: OldQuest[] = (await pg.query("SELECT * FROM quest"))
    .rows as any;
  const oldNodes: OldNode[] = (await pg.query("SELECT * FROM node"))
    .rows as any;
  const oldLinks: OldLink[] = (await pg.query("SELECT * FROM link"))
    .rows as any;
  const oldChats: OldChat[] = (await pg.query('SELECT * FROM "chatMessages"'))
    .rows as any;
  const oldProfiles: OldUserProfile[] = (
    await pg.query('SELECT * FROM "userProfile"')
  ).rows as any;

  // === TRANSFORM ===
  const quests: NewQuest[] = oldQuests.map((q) => {
    const status = mapQuestStatus(q, now);
    const finishedAt =
      status === "expired"
        ? q.dueDate
          ? new Date(q.dueDate)
          : null
        : q.status === "finished"
        ? new Date(q.dueDate ?? q.creationDate)
        : null;
    return {
      id: q.id,
      type: mapQuestType(q.type),
      title: q.title,
      shareTitle: null,
      description: lexicalToPlainText(q.description),
      rewardAmount: q.rewardAmount ?? "0",
      baseBlobPath: q.baseBlobPath,
      creationDate: toTs(new Date(q.creationDate)),
      creatorId: q.creatorId,
      startDate: q.startDate ? toTs(new Date(q.startDate)) : null,
      seekerId: q.starterId ?? null,
      status,
      farewellMessage: q.terminationReason ?? null,
      coverPhoto: placeholderCover(q.title, q.coverPhotoUrl),
      media: mediaArray(q.coverPhotoUrl, q.coverYTVideoUrl),
      screeningQuestions: mapScreeningQuestions(q.secretQuestions),
      reshareLabel: null,
      proposeAnswerLabel: null,
      saveForLaterLabel: null,
      lastContributionAt: null,
      finishedAt: finishedAt ? toTs(finishedAt) : null,
      rootNodeId: null, // set in phase 4
    };
  });

  const nodesPhase: NewNode[] = oldNodes.map((n) => ({
    id: n.id,
    questId: n.questId,
    seekerId: n.starterId,
    userId: n.userId,
    referer: n.referer,
    status: mapNodeStatus(n.status),
    parentId: n.parentId,
    viewLinkId: null, // set later
    createdAt: toTs(new Date(n.creationDate)),
  }));

  const linksPhase: NewLink[] = oldLinks.map((l) => {
    const quest = quests.find((q) => q.id === l.questId);
    const type = quest?.type === "restricted" ? "targeted" : "broadcast";
    return {
      id: l.id,
      questId: l.questId,
      ownerNodeId: l.ownerNodeId,
      type,
      name: l.name,
      endorsement: null,
      reason: l.reason,
      relationshipStrength: type === "targeted" ? null : null,
      linkCode: l.linkCode,
      active: l.active ? 1 : 0,
      createdAt: toTs(new Date(l.creationDate)),
    };
  });

  const chats: NewChat[] = oldChats.map((c) => ({
    id: c.id,
    questId: c.questId,
    nodeId: c.nodeId,
    userId: c.contributorId,
    content: c.content,
    timestamp: toTs(new Date(c.timestamp)),
    status: c.status,
  }));

  const profiles: NewUserProfile[] = oldProfiles.map((p) => ({
    userId: p.userId,
    emailEnabled: (p.emailEnabled ? 1 : 0) as number,
    credence: "0",
    emailFrequency: p.emailFrequency,
    lastSentAt: p.lastSentAt ? toTs(new Date(p.lastSentAt)) : null,
    timezone: p.timezone || "Europe/Berlin",
    asciiName: "",
  }));

  // === DRY RUN REPORT ===
  if (DRY_RUN) {
    console.log("--- DRY RUN REPORT ---");
    console.log({
      quests: quests.length,
      nodes: nodesPhase.length,
      links: linksPhase.length,
      chats: chats.length,
      profiles: profiles.length,
    });
    console.log("Sample quest transform:", quests[0]);
    await pg.end();
    sqlite.close();
    return;
  }

  // === INSERT PHASES ===
  const tx = sqlite.transaction(() => {
    // Phase 1: Quests (without rootNodeId)
    const insQuest = sqlite.prepare(`INSERT INTO quest (
      id, type, title, shareTitle, description, rewardAmount, baseBlobPath,
      creationDate, creatorId, startDate, seekerId, status, farewellMessage,
      coverPhoto, media, screeningQuestions, reshareLabel, proposeAnswerLabel, saveForLaterLabel,
      lastContributionAt, finishedAt, rootNodeId
    ) VALUES (@id,@type,@title,@shareTitle,@description,@rewardAmount,@baseBlobPath,
      @creationDate,@creatorId,@startDate,@seekerId,@status,@farewellMessage,
      @coverPhoto,@media,@screeningQuestions,@reshareLabel,@proposeAnswerLabel,@saveForLaterLabel,
      @lastContributionAt,@finishedAt,@rootNodeId)`);
    for (const q of quests) insQuest.run(q as any);

    // Phase 2: Nodes (without viewLinkId)
    const insNode = sqlite.prepare(`INSERT INTO node (
      id, questId, seekerId, userId, referer, status, parentId, viewLinkId, createdAt
    ) VALUES (@id,@questId,@seekerId,@userId,@referer,@status,@parentId,@viewLinkId,@createdAt)`);
    for (const n of nodesPhase) insNode.run(n as any);

    // Phase 3: Links
    const insLink = sqlite.prepare(`INSERT INTO link (
      id, questId, ownerNodeId, type, name, endorsement, reason, relationshipStrength,
      linkCode, active, createdAt
    ) VALUES (@id,@questId,@ownerNodeId,@type,@name,@endorsement,@reason,@relationshipStrength,
      @linkCode,@active,@createdAt)`);
    for (const l of linksPhase) insLink.run(l as any);

    // Phase 3b: Update nodes.viewLinkId (now that links exist)
    const oldNodeById = new Map(oldNodes.map((n) => [n.id, n] as const));
    const updNodeView = sqlite.prepare(
      `UPDATE node SET viewLinkId = ? WHERE id = ?`,
    );
    for (const n of nodesPhase) {
      const oldN = oldNodeById.get(n.id)!;
      if (oldN.viewLinkId) updNodeView.run(oldN.viewLinkId, n.id);
    }

    // Phase 4: quest.rootNodeId
    const updQuestRoot = sqlite.prepare(
      `UPDATE quest SET rootNodeId = ? WHERE id = ?`,
    );
    for (const q of oldQuests) {
      if (q.rootNodeId) updQuestRoot.run(q.rootNodeId, q.id);
    }

    // Phase 5: Chats
    const insChat = sqlite.prepare(`INSERT INTO chatMessages (
      id, questId, nodeId, userId, content, timestamp, status
    ) VALUES (@id,@questId,@nodeId,@userId,@content,@timestamp,@status)`);
    for (const c of chats) insChat.run(c as any);

    // Phase 6: User Profiles
    const insProfile = sqlite.prepare(`INSERT INTO userProfile (
      userId, emailEnabled, credence, emailFrequency, lastSentAt, timezone, asciiName
    ) VALUES (@userId,@emailEnabled,@credence,@emailFrequency,@lastSentAt,@timezone,@asciiName)
      ON CONFLICT(userId) DO UPDATE SET
        emailEnabled=excluded.emailEnabled,
        emailFrequency=excluded.emailFrequency,
        lastSentAt=excluded.lastSentAt,
        timezone=excluded.timezone`);
    for (const p of profiles) insProfile.run(p as any);

    // Phase 7: QuestUserRelation backfill
    // - Seeker relation (nodeId = rootNodeId, create synthetic link if none exists)
    const getQuestLinks = sqlite
      .prepare(`SELECT id FROM link WHERE questId = ?`)
      .pluck();
    const createLink =
      sqlite.prepare(`INSERT INTO link (id, questId, ownerNodeId, type, name, endorsement, reason, relationshipStrength, linkCode, active, createdAt)
      VALUES (@id,@questId,@ownerNodeId,@type,@name,@endorsement,@reason,@relationshipStrength,@linkCode,@active,@createdAt)`);
    const insQUR =
      sqlite.prepare(`INSERT INTO questUserRelation (id, questId, linkId, nodeId, userId, createdAt)
      VALUES (@id,@questId,@linkId,@nodeId,@userId,@createdAt)`);

    for (const q of quests) {
      const linksForQuest: string[] = getQuestLinks.all(q.id) as any;
      let linkId: string | undefined = linksForQuest[0];
      if (!linkId) {
        // create synthetic seeker link owned by root node or any node of quest
        const anyNode = nodesPhase.find((n) => n.questId === q.id);
        if (anyNode) {
          linkId = randomUUID();
          createLink.run({
            id: linkId,
            questId: q.id,
            ownerNodeId: anyNode.id,
            type: q.type === "restricted" ? "targeted" : "broadcast",
            name: "auto-seeker-link",
            endorsement: null,
            reason: "synthetic link for seeker relation",
            relationshipStrength: null,
            linkCode: `auto-${linkId.slice(0, 8)}`,
            active: 1,
            createdAt: toTs(new Date())!,
          } as any);
        }
      }

      if (linkId && q.seekerId && q.rootNodeId) {
        insQUR.run({
          id: randomUUID(),
          questId: q.id,
          linkId,
          nodeId: q.rootNodeId, // = root -> seeker
          userId: q.seekerId,
          createdAt: toTs(new Date(q.creationDate)),
        } as any);
      }
    }

    // - Contributor relations (nodeId = node.id)
    const getNodeLink = sqlite
      .prepare(`SELECT viewLinkId FROM node WHERE id = ?`)
      .pluck();
    for (const n of nodesPhase) {
      // skip seeker node relation duplication if same as above? (ok to add contributor too)
      const linkId =
        (getNodeLink.get(n.id) as string) ||
        (getQuestLinks.get(n.questId) as string);
      if (!linkId) continue; // shouldn't happen, but skip
      insQUR.run({
        id: randomUUID(),
        questId: n.questId,
        linkId,
        nodeId: n.id,
        userId: n.userId,
        createdAt: n.createdAt,
      } as any);
    }
  });

  tx();

  // Re-enable FK and basic integrity checks by attempting a simple query
  sqlite.pragma("foreign_keys = ON");

  // Simple validation counts
  const count = (sqlStr: string) =>
    sqlite.prepare(sqlStr).get() as { c: number };
  console.log("Inserted counts:", {
    quests: count("SELECT COUNT(*) as c FROM quest").c,
    nodes: count("SELECT COUNT(*) as c FROM node").c,
    links: count("SELECT COUNT(*) as c FROM link").c,
    chats: count("SELECT COUNT(*) as c FROM chatMessages").c,
    profiles: count("SELECT COUNT(*) as c FROM userProfile").c,
    qurs: count("SELECT COUNT(*) as c FROM questUserRelation").c,
  });

  await pg.end();
  sqlite.close();
  console.log("Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
