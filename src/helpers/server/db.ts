// helpers/sql-enums.ts
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
