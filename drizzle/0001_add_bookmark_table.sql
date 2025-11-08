PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmark" (
  "id" text PRIMARY KEY NOT NULL,
  "questId" text NOT NULL,
  "userId" text NOT NULL,
  "linkId" text NOT NULL,
  "createdAt" integer NOT NULL,
  CONSTRAINT "bookmark_questId_quest_id_fk" FOREIGN KEY ("questId") REFERENCES "quest"("id") ON UPDATE cascade ON DELETE cascade,
  CONSTRAINT "bookmark_linkId_link_id_fk" FOREIGN KEY ("linkId") REFERENCES "link"("id") ON UPDATE cascade ON DELETE cascade,
  CONSTRAINT "fk_bookmark_link_same_quest" FOREIGN KEY ("linkId","questId") REFERENCES "link"("id","questId") ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_bookmark_per_user_per_quest" ON "bookmark" ("questId","userId");
--> statement-breakpoint
PRAGMA foreign_keys=ON;
