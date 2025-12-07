/**
 * scripts/backfill-history-and-answers.ts
 *
 * One-shot backfill that does BOTH:
 *  1) Populate questHistory with: nodeJoined, reflow, terminated, expired
 *  2) Synthesize proposedAnswer rows from old nodes (accepted/rejected) and
 *     add questHistory entries: answerAccepted / answerRejected
 *
 * Usage:
 *   # dry-run (default)
 *   pnpx ts-node --project tsconfig.json scripts/backfill-history-and-answers.ts
 *
 *   # execute (write changes)
 *   pnpx ts-node --project tsconfig.json scripts/backfill-history-and-answers.ts --execute
 *
 * Env:
 *   OLD_DB_URL  - Postgres connection string (old DB)
 *   NEW_DB_PATH - path to SQLite file (new DB)
 */

import dotenv from "dotenv";
dotenv.config();
import { Client as PgClient } from "pg";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const DRY_RUN = !process.argv.includes("--execute");
const OLD_DB_URL = process.env.OLD_DB_URL!;
const NEW_DB_PATH = process.env.NEW_DB_PATH || "./new.sqlite";
if (!OLD_DB_URL) {
  console.error("Missing OLD_DB_URL");
  process.exit(1);
}

const toTs = (d: Date | string | null | undefined) =>
  d ? new Date(d).getTime() : null;

type OldQuest = {
  id: string;
  creatorId: string | null;
  creationDate: string;
  dueDate: string | null;
  status: "draft" | "active" | "finished" | "terminated";
  terminationReason: string | null;
  starterId: string | null;
};

type OldNode = {
  id: string;
  questId: string;
  userId: string;
  status: "contributed" | "accepted" | "rejected";
  creationDate: string;
};

type OldLink = {
  id: string;
  questId: string;
  ownerNodeId: string;
  creationDate: string;
};

type OldChat = {
  id: string;
  nodeId: string;
  contributorId: string;
  content: string;
  timestamp: string;
};

async function main() {
  const now = Date.now();

  const pg = new PgClient({ connectionString: OLD_DB_URL });
  await pg.connect();

  const sqlite = new Database(NEW_DB_PATH);
  sqlite.pragma("foreign_keys = ON");

  // --- Load from Postgres (quote camelCase identifiers) ---
  const oldQuests = (
    await pg.query(
      `SELECT "id","creatorId","creationDate","dueDate","status","terminationReason","starterId" FROM quest`,
    )
  ).rows as OldQuest[];

  const oldNodes = (
    await pg.query(
      `SELECT "id","questId","userId","status","creationDate" FROM node`,
    )
  ).rows as OldNode[];

  const oldLinks = (
    await pg.query(
      `SELECT "id","questId","ownerNodeId","creationDate" FROM link`,
    )
  ).rows as OldLink[];

  const nodeIdsAcceptedRejected = oldNodes
    .filter((n) => n.status === "accepted" || n.status === "rejected")
    .map((n) => n.id);

  let oldChats: OldChat[] = [];
  if (nodeIdsAcceptedRejected.length) {
    const placeholders = nodeIdsAcceptedRejected
      .map((_, i) => `$${i + 1}`)
      .join(",");
    const res = await pg.query(
      `SELECT "id","nodeId","contributorId","content","timestamp" FROM "chatMessages" WHERE "nodeId" IN (${placeholders})`,
      nodeIdsAcceptedRejected,
    );
    oldChats = res.rows as OldChat[];
  }

  // --- Build helpers ---
  const nodeIdToUser = new Map<string, string>();
  for (const n of oldNodes) nodeIdToUser.set(n.id, n.userId);

  const latestChatByNodeUser = new Map<string, OldChat>(); // key: nodeId::userId
  for (const c of oldChats) {
    const key = `${c.nodeId}::${c.contributorId}`;
    const prev = latestChatByNodeUser.get(key);
    if (!prev || (toTs(c.timestamp) ?? 0) > (toTs(prev.timestamp) ?? 0)) {
      latestChatByNodeUser.set(key, c);
    }
  }

  // === Part A: questHistory basics (nodeJoined, reflow, terminated, expired) ===
  type HistRow = {
    id: string;
    questId: string;
    actorUserId: string | null;
    type:
      | "reflow"
      | "answerProposed"
      | "answerAccepted"
      | "answerRejected"
      | "terminated"
      | "expired"
      | "questEdited"
      | "nodeJoined"
      | "commentAdded";
    createdAt: number;
    linkId?: string | null;
    nodeId?: string | null;
    commentId?: string | null;
    proposedAnswerId?: string | null;
  };

  const histRows: HistRow[] = [];

  // A1) nodeJoined for each node
  for (const n of oldNodes) {
    histRows.push({
      id: randomUUID(),
      questId: n.questId,
      actorUserId: n.userId ?? null,
      type: "nodeJoined",
      createdAt: toTs(n.creationDate) ?? now,
      nodeId: n.id,
    });
  }

  // A2) reflow for each link
  for (const l of oldLinks) {
    const actor = nodeIdToUser.get(l.ownerNodeId) ?? null;
    histRows.push({
      id: randomUUID(),
      questId: l.questId,
      actorUserId: actor,
      type: "reflow",
      createdAt: toTs(l.creationDate) ?? now,
      linkId: l.id,
    });
  }

  // A3) terminated / expired per quest
  for (const q of oldQuests) {
    if (
      q.status === "terminated" ||
      (q.status === "finished" && q.terminationReason)
    ) {
      const ts = toTs(q.dueDate) ?? toTs(q.creationDate) ?? now;
      histRows.push({
        id: randomUUID(),
        questId: q.id,
        actorUserId: q.creatorId ?? null,
        type: "terminated",
        createdAt: ts,
      });
    }
    if (q.dueDate) {
      const dueTs = toTs(q.dueDate)!;
      if (
        dueTs < Date.now() &&
        q.status !== "terminated" &&
        q.status !== "finished"
      ) {
        histRows.push({
          id: randomUUID(),
          questId: q.id,
          actorUserId: q.creatorId ?? null,
          type: "expired",
          createdAt: dueTs,
        });
      }
    }
  }

  // === Part B: proposedAnswer + answerAccepted/Rejected history ===
  type ProposalRow = {
    id: string;
    questId: string;
    nodeId: string;
    userId: string;
    content: string;
    screeningAnswers: string; // JSON string
    status: "pending" | "accepted" | "rejected";
    createdAt: number;
    decidedAt: number | null;
  };

  const proposalRows: ProposalRow[] = [];

  // Determine accepted winners per quest (only one allowed)
  const acceptedByQuest = new Map<string, OldNode[]>();
  for (const n of oldNodes.filter((x) => x.status === "accepted")) {
    const arr = acceptedByQuest.get(n.questId) || [];
    arr.push(n);
    acceptedByQuest.set(n.questId, arr);
  }
  const acceptedWinnerByQuest = new Map<string, string>(); // questId -> nodeId
  for (const [qid, arr] of acceptedByQuest.entries()) {
    arr.sort((a, b) => toTs(a.creationDate)! - toTs(b.creationDate)!); // earliest wins
    if (arr[0]) acceptedWinnerByQuest.set(qid, arr[0].id);
  }

  // Build proposals from accepted/rejected nodes
  const candidateNodes = oldNodes.filter(
    (n) => n.status === "accepted" || n.status === "rejected",
  );
  for (const n of candidateNodes) {
    const winner = acceptedWinnerByQuest.get(n.questId);
    const enforcedStatus: "accepted" | "rejected" =
      n.status === "accepted" && n.id === winner ? "accepted" : "rejected";

    const latest = latestChatByNodeUser.get(`${n.id}::${n.userId}`);
    const ts = latest ? toTs(latest.timestamp)! : toTs(n.creationDate)!;

    let content =
      (latest?.content || "").trim() ||
      "[Migrated] Proposed answer with no chat content.";
    if (n.status === "accepted" && enforcedStatus === "rejected") {
      content =
        `[Migrated: downgraded from accepted due to one-accepted-per-quest]\n` +
        content;
    }

    const proposalId = randomUUID();
    proposalRows.push({
      id: proposalId,
      questId: n.questId,
      nodeId: n.id,
      userId: n.userId,
      content,
      screeningAnswers: JSON.stringify([]),
      status: enforcedStatus,
      createdAt: ts,
      decidedAt: ts,
    });

    histRows.push({
      id: randomUUID(),
      questId: n.questId,
      actorUserId: n.userId,
      type: enforcedStatus === "accepted" ? "answerAccepted" : "answerRejected",
      createdAt: ts,
      proposedAnswerId: proposalId,
    });
  }

  // --- DRY RUN REPORT ---
  if (DRY_RUN) {
    const historyByType = histRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
    const proposalsByStatus = proposalRows.reduce<Record<string, number>>(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {},
    );
    console.log("--- DRY RUN: Backfill history + answers ---");
    console.log({
      quests: oldQuests.length,
      nodes: oldNodes.length,
      links: oldLinks.length,
      candidateProposalNodes: candidateNodes.length,
      proposals: proposalRows.length,
      proposalsByStatus,
      historyPlanned: histRows.length,
      historyByType,
      sampleProposal: proposalRows[0],
      sampleHistory: histRows[0],
    });
    await pg.end();
    sqlite.close();
    return;
  }

  // --- EXECUTE ---
  const tx = sqlite.transaction(() => {
    const insProposal = sqlite.prepare(
      `INSERT INTO proposedAnswer (id, questId, nodeId, userId, content, screeningAnswers, status, createdAt, decidedAt)
       VALUES (@id,@questId,@nodeId,@userId,@content,@screeningAnswers,@status,@createdAt,@decidedAt)`,
    );
    const insHistoryFull = sqlite.prepare(
      `INSERT INTO questHistory (id, questId, actorUserId, type, createdAt, linkId, nodeId, commentId, proposedAnswerId)
       VALUES (@id, @questId, @actorUserId, @type, @createdAt, @linkId, @nodeId, @commentId, @proposedAnswerId)`,
    );

    // Insert proposals: accepted first to respect unique filtered index, then rejected
    for (const p of proposalRows.filter((x) => x.status === "accepted"))
      insProposal.run(p as any);
    for (const p of proposalRows.filter((x) => x.status === "rejected"))
      insProposal.run(p as any);

    // Insert all history rows
    for (const h of histRows) {
      insHistoryFull.run({
        id: h.id,
        questId: h.questId,
        actorUserId: h.actorUserId ?? null,
        type: h.type,
        createdAt: h.createdAt,
        linkId: h.linkId ?? null,
        nodeId: h.nodeId ?? null,
        commentId: h.commentId ?? null,
        proposedAnswerId: h.proposedAnswerId ?? null,
      });
    }
  });

  try {
    tx();
  } catch (err) {
    console.error("Transaction failed:", err);
    await pg.end();
    sqlite.close();
    process.exit(1);
  }

  const counts = {
    proposedAnswers: (
      sqlite.prepare("SELECT COUNT(*) as c FROM proposedAnswer").get() as any
    ).c,
    questHistory: (
      sqlite.prepare("SELECT COUNT(*) as c FROM questHistory").get() as any
    ).c,
  };
  console.log("Inserted totals:", counts);

  await pg.end();
  sqlite.close();
  console.log("Backfill complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
