PRAGMA foreign_keys=OFF;
--> statement-breakpoint
ALTER TABLE "node" DROP COLUMN "status";
--> statement-breakpoint
PRAGMA foreign_keys=ON;
