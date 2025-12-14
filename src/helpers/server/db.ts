// helpers/sql-enums.ts
import { updateTypeDef } from "@/db/constants";
import { nodeTable, questHistoryTable, questTable } from "@/db/schema";
import { SQL, sql } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";

const escape = (s: string) => s.replace(/'/g, "''");

// Embed a string as a SQL literal (static, no params in DDL)
export const lit = (s: string) => sql.raw(`'${escape(s)}'`);

// Convenience to build IN (...) lists
export const inList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${escape(v)}'`).join(","));

/**
 * Executes the given SQL query and returns the resulting rows,
 * recursively converting any fields whose keys match /date|time|timestamp|*_at|*At/i
 * from ISO strings into JavaScript Date objects.
 *
 * On error, expands and inlines the query parameters into the SQL text
 * for easier debugging.
 *
 * @template T - The expected shape of each result row.
 * @param {SQL} query - A Drizzle-ORM SQL query object.
 * @returns {Promise<T[]>} - A promise that resolves to an array of rows with Dates reconstructed.
 *
 * @example
 * // Assume we have a "users" table with columns:
 * //   id UUID, username TEXT, created_at TIMESTAMPTZ
 * //
 * // Build a Drizzle SQL query:
 * const query = sql`
 *   SELECT
 *     id,
 *     username,
 *     created_at
 *   FROM users
 *   WHERE active = ${true}
 * `;
 *
 * // Input (raw rows):
 * // [
 * //   {
 * //     id: '550e8400-e29b-41d4-a716-446655440000',
 * //     username: 'alice',
 * //     created_at: '2025-06-10T14:23:45.123Z'
 * //   }
 * // ]
 *
 * // Use execute to run and convert date strings:
 * const users = await execute<{
 *   id: string;
 *   username: string;
 *   created_at: Date;
 * }>(query);
 *
 * // Output:
 * // [
 * //   {
 * //     id: '550e8400-e29b-41d4-a716-446655440000',
 * //     username: 'alice',
 * //     created_at: new Date('2025-06-10T14:23:45.123Z')
 * //   }
 * // ]
 */

const shouldParse = (k: string) => {
  return (
    /(?:date|time|timestamp)s?$/i.test(k) ||
    /(?:^|_)at$/i.test(k) ||
    /At$/.test(k)
  );
};

export async function executeWithDateParsing<T>(
  query: SQL,
  db: DrizzleD1Database<Record<string, unknown>>,
) {
  const rows = await db.all(query);
  const reconstructDates = (inputData: unknown, dateKey: boolean): unknown => {
    if (inputData === undefined) return inputData;
    if (inputData === null) return inputData;
    if (Array.isArray(inputData))
      return inputData.map((e) => reconstructDates(e, dateKey));
    if (typeof inputData === "object")
      return Object.fromEntries(
        Object.entries(inputData).map(([key, value]) => [
          key,
          reconstructDates(value, shouldParse(key)),
        ]),
      );
    if (
      (typeof inputData === "string" || typeof inputData === "number") &&
      dateKey
    ) {
      if (typeof inputData === "number") {
        const epochMs = inputData; // < 1e12 ? inputData * 1000 : inputData;
        return new Date(epochMs);
      }
      if (typeof inputData === "string") {
        const ts = Date.parse(inputData);
        if (Number.isFinite(ts)) return new Date(ts);
      }
    }
    return inputData;
  };
  return rows.map((r) => reconstructDates(r, false)) as T[];
}

export type QuestState =
  | "Young"
  | "Thriving"
  | "Stable"
  | "Fading"
  | "Withering";

// Compute the status of the quest based on its share tree given following intuitions:
// "Thriving": High level of participation and "growth" of the share tree
// "Stable": Daily activity but not with high growth rates
// "Fading": Daily or day in between activity but with decay in participation rate
// "Withering": Without activity in past 7 days
// "Young": If the quest is not thriving but no more than 3 days has passed since creation of the quest
// This translates into the following rules:
// “Thriving” ≈ R_short comfortably above 1
// “Stable” ≈ activity present but R around ~1 or slightly below, and not worsening
// “Fading” ≈ activity present but R_short<R_long (trend downward) and subcritical
// “Withering” ≈ no activity in 7 days
// “Young” ≈ quest age ≤ 3 days and not thriving
// Where R = “How many new active participants does one active participant create?”
// and R_short over the last 24h (or 48h)
// and R_long over the last 7 days (or 5 days).

export function computeQuestState(
  quest: typeof questTable.$inferSelect,
  nodes: Array<typeof nodeTable.$inferSelect>,
  history: Array<typeof questHistoryTable.$inferSelect>,
): QuestState {
  // --------------------------------
  // 0) Lifecycle guard (new info)
  // --------------------------------
  // Quest health states only make sense for active quests.
  // (Solved/terminated/expired are lifecycle outcomes, not “health”.)
  if (quest.status !== "active") return "Stable";

  // --------------------------------
  // 1) Time helpers / constants
  // --------------------------------
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const SHORT_WINDOW_MS = 48 * HOUR; // less noisy than 24h
  const LONG_WINDOW_MS = 7 * DAY; // matches Withering rule
  const YOUNG_WINDOW_MS = 3 * DAY;

  // Thresholds (tune later)
  const THRIVING_R_MIN = 1.2;
  const STABLE_R_MIN = 0.9;

  // Confidence gates (absolute actor count)
  const MIN_THRIVING_ACTORS_SHORT = 4;
  const MIN_LONG_SIGNAL_ACTORS = 6;

  // --------------------------------
  // 2) Typed-ish utilities
  // --------------------------------
  const ts = (v: unknown): number | null => {
    if (v == null) return null;
    const n =
      typeof v === "number" ? v : new Date(v as string | Date).getTime();
    return Number.isFinite(n) ? n : null;
  };

  const within = (windowMs: number) => (t: number | null) =>
    t != null && t >= now - windowMs;

  const uniqCount = (values: Array<string | null | undefined>) => {
    const s = new Set<string>();
    for (const v of values) if (v) s.add(v);
    return s.size;
  };

  const safeDiv = (num: number, den: number) => num / Math.max(1, den);

  // --------------------------------
  // 3) Scope to quest (defensive)
  // --------------------------------
  const questNodes = nodes.filter((n) => n.questId === quest.id);
  const questHistory = history.filter((h) => h.questId === quest.id);

  // --------------------------------
  // 4) Define “activity” vs “participation”
  // --------------------------------
  // Activity: anything that indicates the quest is alive (prevents Withering),
  // but excludes admin/lifecycle records that don’t reflect social engagement.
  const ACTIVITY_TYPES: Array<(typeof updateTypeDef)[number]> = [
    "reflow",
    "nodeJoined",
    "commentAdded",
    "answerProposed",
    "answerAccepted",
    "answerRejected",
  ];

  // Participation actors: people taking actions that indicate ownership / propagation.
  // Intentionally *exclude* nodeJoined so new joiners don’t immediately inflate actor counts.
  const PARTICIPATION_TYPES: Array<(typeof updateTypeDef)[number]> = [
    "reflow",
    "commentAdded",
    "answerProposed",
  ];

  // --------------------------------
  // 5) Compute last meaningful activity (Withering check)
  // --------------------------------
  const lastNodeAt = questNodes.reduce<number | null>((max, n) => {
    const t = ts(n.createdAt);
    if (t == null) return max;
    return max == null ? t : Math.max(max, t);
  }, null);

  const lastActivityHistoryAt = questHistory.reduce<number | null>((max, h) => {
    if (!ACTIVITY_TYPES.includes(h.type)) return max;
    const t = ts(h.createdAt);
    if (t == null) return max;
    return max == null ? t : Math.max(max, t);
  }, null);

  const lastContributionAt = ts(quest.lastContributionAt);

  const lastActivityAt = [
    lastNodeAt,
    lastActivityHistoryAt,
    lastContributionAt,
  ].reduce<number | null>((max, t) => {
    if (t == null) return max;
    return max == null ? t : Math.max(max, t);
  }, null);

  const msSinceLastActivity =
    lastActivityAt == null ? Number.POSITIVE_INFINITY : now - lastActivityAt;

  // Withering: without activity in past 7 days
  if (msSinceLastActivity > 7 * DAY) return "Withering";

  // --------------------------------
  // 6) Window metrics
  // --------------------------------
  const newNodesIn = (windowMs: number) =>
    questNodes.filter((n) => within(windowMs)(ts(n.createdAt))).length;

  const participationActorsIn = (windowMs: number) => {
    const actors = questHistory
      .filter((h) => within(windowMs)(ts(h.createdAt)))
      .filter((h) => PARTICIPATION_TYPES.includes(h.type))
      .map((h) => h.actorUserId);
    return uniqCount(actors);
  };

  const anyActivityIn = (windowMs: number) => {
    const hasNewNodes = newNodesIn(windowMs) > 0;
    const hasActivityHistory = questHistory.some(
      (h) =>
        ACTIVITY_TYPES.includes(h.type) && within(windowMs)(ts(h.createdAt)),
    );
    return hasNewNodes || hasActivityHistory;
  };

  const shortNewNodes = newNodesIn(SHORT_WINDOW_MS);
  const longNewNodes = newNodesIn(LONG_WINDOW_MS);

  const shortActors = participationActorsIn(SHORT_WINDOW_MS);
  const longActors = participationActorsIn(LONG_WINDOW_MS);

  const R_short = safeDiv(shortNewNodes, shortActors);
  const R_long = safeDiv(longNewNodes, longActors);

  const hasShortActivity = anyActivityIn(SHORT_WINDOW_MS);

  // Young rule (your definition)
  const questCreatedAt = ts(quest.creationDate) ?? now;
  const isYoung = now - questCreatedAt <= YOUNG_WINDOW_MS;

  // Daily / every-other-day nuance
  const daysSinceActivity = msSinceLastActivity / DAY;
  const hasDailyishActivity = daysSinceActivity <= 1.2;
  const hasEveryOtherDayActivity = daysSinceActivity <= 2.2;

  // Trend: only trust “decay” if long window has enough signal
  const longSignalOk = longActors >= MIN_LONG_SIGNAL_ACTORS;
  const decay = longSignalOk ? R_short < R_long * 0.9 : false;

  // --------------------------------
  // 7) Classification
  // --------------------------------
  const thriving =
    hasShortActivity &&
    shortActors >= MIN_THRIVING_ACTORS_SHORT &&
    shortNewNodes >= 2 &&
    R_short >= THRIVING_R_MIN;

  if (thriving) return "Thriving";

  if (isYoung) return "Young";

  // Stable: activity is happening (daily-ish or every other day) and either:
  // - near-critical growth, OR
  // - not clearly decaying (or insufficient long signal to claim decay)
  const stable =
    hasShortActivity &&
    (hasDailyishActivity || hasEveryOtherDayActivity) &&
    (R_short >= STABLE_R_MIN || !decay);

  if (stable) return "Stable";

  // Fading: activity exists but effectiveness is subcritical and (when measurable) decaying
  // If long signal is weak, we still call it fading when subcritical + not stable.
  return "Fading";
}
