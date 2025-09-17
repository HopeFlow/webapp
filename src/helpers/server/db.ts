// helpers/sql-enums.ts
import { sql } from "drizzle-orm";

const escape = (s: string) => s.replace(/'/g, "''");

// Embed a string as a SQL literal (static, no params in DDL)
export const lit = (s: string) => sql.raw(`'${escape(s)}'`);

// Convenience to build IN (...) lists
export const inList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${escape(v)}'`).join(","));
