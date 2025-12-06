DROP INDEX IF EXISTS `link_id_quest_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `uniq_link_id_quest` ON `link` (`id`,`questId`);--> statement-breakpoint
DROP INDEX IF EXISTS `node_id_quest_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `uniq_node_id_quest` ON `node` (`id`,`questId`);