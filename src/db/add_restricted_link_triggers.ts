// helpers/add_restricted_link_triggers.ts
import { sql } from "drizzle-orm";
import { linkTypeDef, questTypeDef } from "./constants";
import { lit } from "../helpers/server/db";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { mirrorEnum } from "@/helpers/client/type_helpers";
import { linkTable, questTable } from "./schema";
const LinkType = mirrorEnum(linkTypeDef);
const QuestType = mirrorEnum(questTypeDef);

export async function up(db: DrizzleD1Database<Record<string, unknown>>) {
  await db.run(sql`
    CREATE TRIGGER IF NOT EXISTS trg_link_ins_restricted_only_targeted
    BEFORE INSERT ON ${linkTable}
    FOR EACH ROW
    WHEN (
      (SELECT q.type FROM ${questTable} AS q WHERE q.id = NEW.questId) = ${lit(
    QuestType.restricted,
  )}
      AND NEW.type <> ${lit(LinkType.targeted)}
    )
    BEGIN
      SELECT RAISE(ABORT, 'Restricted quests can only have targeted links');
    END;
  `);

  await db.run(sql`
    CREATE TRIGGER IF NOT EXISTS trg_link_upd_restricted_only_targeted
    BEFORE UPDATE OF type, questId ON ${linkTable}
    FOR EACH ROW
    WHEN (
      (SELECT q.type FROM ${questTable} AS q WHERE q.id = NEW.questId) = ${lit(
    QuestType.restricted,
  )}
      AND NEW.type <> ${lit(LinkType.targeted)}
    )
    BEGIN
      SELECT RAISE(ABORT, 'Restricted quests can only have targeted links');
    END;
  `);

  await db.run(sql`
    CREATE TRIGGER IF NOT EXISTS trg_quest_restrict_block_existing_broadcast
    BEFORE UPDATE OF type ON ${questTable}
    FOR EACH ROW
    WHEN (${lit(QuestType.restricted)} = NEW.type AND EXISTS (
      SELECT 1 FROM ${linkTable} l
      WHERE l.questId = NEW.id AND l.type <> ${lit(LinkType.targeted)}
    ))
    BEGIN
      SELECT RAISE(ABORT, 'Quest cannot be set to restricted while non-targeted links exist');
    END;
  `);
}

export async function down(db: DrizzleD1Database<Record<string, unknown>>) {
  await db.run(
    sql`DROP TRIGGER IF EXISTS trg_link_ins_restricted_only_targeted;`,
  );
  await db.run(
    sql`DROP TRIGGER IF EXISTS trg_link_upd_restricted_only_targeted;`,
  );
  await db.run(
    sql`DROP TRIGGER IF EXISTS trg_quest_restrict_block_existing_broadcast;`,
  );
}
