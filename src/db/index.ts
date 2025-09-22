// db.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "./schema";
import { up as installRestrictedLinkTriggers } from "./add_restricted_link_triggers";

export const getHopeflowDatabase = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  const db = drizzle(env.DB, { schema });

  // Ensure triggers exist (idempotent)
  await installRestrictedLinkTriggers(db);

  return db;
});
