import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { createClient, type Client } from "@libsql/client";

async function dropAllTriggers(client: Client) {
  // sqlite_schema is the canonical schema table in modern SQLite
  const res = await client.execute(
    "SELECT name FROM sqlite_schema WHERE type='trigger' AND name NOT LIKE 'sqlite_%';",
  );

  for (const row of res.rows) {
    const name = String(row.name);
    // Quote the identifier safely for SQLite:
    const quoted = `"${name.replaceAll('"', '""')}"`;
    await client.execute(`DROP TRIGGER IF EXISTS ${quoted};`);
  }
}

async function main() {
  const d1DatabaseObjectPath = path.join(
    __dirname,
    "../.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  const sqliteFilePath = fs
    .readdirSync(d1DatabaseObjectPath)
    .find((f) => f.endsWith(".sqlite"));

  if (!sqliteFilePath) {
    throw new Error(
      `No SQLite file found in ${d1DatabaseObjectPath}. Please ensure the D1 database is set up correctly.`,
    );
  }

  const url =
    process.env.DATABASE_URL ??
    `file://${path.join(d1DatabaseObjectPath, sqliteFilePath)}`;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }

  const client = createClient({ url, authToken });

  await dropAllTriggers(client);
  await dropAllIndexes(client);

  client.close?.();
}

async function dropAllIndexes(client: Client) {
  const res = await client.execute(
    "SELECT name FROM sqlite_schema WHERE type='index' AND name NOT LIKE 'sqlite_%';",
  );

  for (const row of res.rows) {
    const name = String(row.name);
    const quoted = `"${name.replaceAll('"', '""')}"`;
    await client.execute(`DROP INDEX IF EXISTS ${quoted};`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
