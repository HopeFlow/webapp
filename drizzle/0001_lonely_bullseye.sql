PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TRIGGER IF EXISTS `trg_link_ins_restricted_only_targeted`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `trg_link_upd_restricted_only_targeted`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `trg_quest_restrict_block_existing_broadcast`;--> statement-breakpoint
DROP TABLE `bookmark`;--> statement-breakpoint
CREATE TABLE `__new_link` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`ownerNodeId` text NOT NULL,
	`type` text DEFAULT 'targeted' NOT NULL,
	`name` text,
	`endorsement` text,
	`reason` text,
	`relationshipStrength` integer,
	`linkCode` text NOT NULL,
	`active` integer DEFAULT true,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerNodeId`) REFERENCES `node`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ownerNodeId`,`questId`) REFERENCES `node`(`id`,`questId`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "link_relationship_strength_chk" CHECK(
      ( "__new_link"."type" = 'targeted' AND "__new_link"."relationshipStrength" BETWEEN 1 AND 5 )
      OR ( "__new_link"."type" <> 'targeted' AND "__new_link"."relationshipStrength" IS NULL )
    )
);
--> statement-breakpoint
INSERT INTO `__new_link`("id", "questId", "ownerNodeId", "type", "name", "endorsement", "reason", "relationshipStrength", "linkCode", "active", "createdAt") SELECT "id", "questId", "ownerNodeId", "type", "name", "endorsement", "reason", "relationshipStrength", "linkCode", "active", "createdAt" FROM `link`;--> statement-breakpoint
DROP TABLE `link`;--> statement-breakpoint
ALTER TABLE `__new_link` RENAME TO `link`;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_link_code` ON `link` (`linkCode`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_link_id_quest` ON `link` (`id`,`questId`);--> statement-breakpoint
CREATE TABLE `__new_node` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`seekerId` text NOT NULL,
	`userId` text NOT NULL,
	`referer` text DEFAULT 'unknown' NOT NULL,
	`parentId` text,
	`viewLinkId` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parentId`) REFERENCES `node`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`viewLinkId`) REFERENCES `link`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`viewLinkId`,`questId`) REFERENCES `link`(`id`,`questId`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_node`("id", "questId", "seekerId", "userId", "referer", "parentId", "viewLinkId", "createdAt") SELECT "id", "questId", "seekerId", "userId", "referer", "parentId", "viewLinkId", "createdAt" FROM `node`;--> statement-breakpoint
DROP TABLE `node`;--> statement-breakpoint
ALTER TABLE `__new_node` RENAME TO `node`;--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_one_root_node_per_quest` ON `node` (`questId`) WHERE "node"."parentId" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `quest_id_user_id_unique` ON `node` (`questId`,`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_node_id_quest` ON `node` (`id`,`questId`);--> statement-breakpoint
CREATE TABLE `__new_quest` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'unrestricted' NOT NULL,
	`title` text NOT NULL,
	`shareTitle` text,
	`description` text NOT NULL,
	`rewardAmount` numeric DEFAULT '0' NOT NULL,
	`baseBlobPath` text NOT NULL,
	`creationDate` integer NOT NULL,
	`creatorId` text NOT NULL,
	`startDate` integer,
	`seekerId` text,
	`status` text DEFAULT 'active' NOT NULL,
	`farewellMessage` text,
	`coverPhoto` text NOT NULL,
	`media` text,
	`screeningQuestions` text,
	`reshareLabel` text,
	`proposeAnswerLabel` text,
	`saveForLaterLabel` text,
	`lastContributionAt` integer,
	`finishedAt` integer,
	`rootNodeId` text,
	FOREIGN KEY (`rootNodeId`) REFERENCES `node`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`rootNodeId`,`id`) REFERENCES `node`(`id`,`questId`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "quest_reward_nonneg_chk" CHECK("__new_quest"."rewardAmount" >= 0),
	CONSTRAINT "quest_coverphoto_aspect_ratio_chk" CHECK(
        json_type("__new_quest"."coverPhoto", '$.width') IN ('integer','real')
        AND json_type("__new_quest"."coverPhoto", '$.height') IN ('integer','real')
        AND json_extract("__new_quest"."coverPhoto", '$.width') > 0
        AND json_extract("__new_quest"."coverPhoto", '$.height') > 0
        AND abs(
          ((1.0 * json_extract("__new_quest"."coverPhoto", '$.width')) / (1.0 * json_extract("__new_quest"."coverPhoto", '$.height'))) - (16.0 / 9.0)
        ) < 0.1
      ),
	CONSTRAINT "quest_finished_after_create_chk" CHECK(
        "__new_quest"."finishedAt" IS NULL OR "__new_quest"."finishedAt" >= "__new_quest"."creationDate"
      )
);
--> statement-breakpoint
INSERT INTO `__new_quest`("id", "type", "title", "shareTitle", "description", "rewardAmount", "baseBlobPath", "creationDate", "creatorId", "startDate", "seekerId", "status", "farewellMessage", "coverPhoto", "media", "screeningQuestions", "reshareLabel", "proposeAnswerLabel", "saveForLaterLabel", "lastContributionAt", "finishedAt", "rootNodeId") SELECT "id", "type", "title", "shareTitle", "description", "rewardAmount", "baseBlobPath", "creationDate", "creatorId", "startDate", "seekerId", "status", "farewellMessage", "coverPhoto", "media", "screeningQuestions", "reshareLabel", "proposeAnswerLabel", "saveForLaterLabel", "lastContributionAt", "finishedAt", "rootNodeId" FROM `quest`;--> statement-breakpoint
DROP TABLE `quest`;--> statement-breakpoint
ALTER TABLE `__new_quest` RENAME TO `quest`;--> statement-breakpoint
CREATE TABLE `__new_userProfile` (
	`userId` text PRIMARY KEY NOT NULL,
	`emailEnabled` integer DEFAULT true NOT NULL,
	`credence` numeric DEFAULT '0' NOT NULL,
	`emailFrequency` text DEFAULT 'daily' NOT NULL,
	`lastSentAt` integer,
	`timezone` text DEFAULT 'Europe/Berlin' NOT NULL,
	`asciiName` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_userProfile`("userId", "emailEnabled", "credence", "emailFrequency", "lastSentAt", "timezone", "asciiName") SELECT "userId", "emailEnabled", "credence", "emailFrequency", "lastSentAt", "timezone", "asciiName" FROM `userProfile`;--> statement-breakpoint
DROP TABLE `userProfile`;--> statement-breakpoint
ALTER TABLE `__new_userProfile` RENAME TO `userProfile`;--> statement-breakpoint
CREATE TABLE `__new_chatMessages` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`nodeId` text NOT NULL,
	`userId` text NOT NULL,
	`content` text NOT NULL,
	`timestamp` integer NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`nodeId`) REFERENCES `node`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_chatMessages`("id", "questId", "nodeId", "userId", "content", "timestamp", "status") SELECT "id", "questId", "nodeId", "userId", "content", "timestamp", "status" FROM `chatMessages`;--> statement-breakpoint
DROP TABLE `chatMessages`;--> statement-breakpoint
ALTER TABLE `__new_chatMessages` RENAME TO `chatMessages`;--> statement-breakpoint
CREATE TABLE `__new_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`nodeId` text NOT NULL,
	`userId` text NOT NULL,
	`likedBy` text,
	`dislikedBy` text,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`nodeId`) REFERENCES `node`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "comment_likedBy_json_valid" CHECK(json_valid("__new_comment"."likedBy")),
	CONSTRAINT "comment_dislikedBy_json_valid" CHECK(json_valid("__new_comment"."dislikedBy"))
);
--> statement-breakpoint
INSERT INTO `__new_comment`("id", "questId", "nodeId", "userId", "likedBy", "dislikedBy", "content", "createdAt") SELECT "id", "questId", "nodeId", "userId", "likedBy", "dislikedBy", "content", "createdAt" FROM `comment`;--> statement-breakpoint
DROP TABLE `comment`;--> statement-breakpoint
ALTER TABLE `__new_comment` RENAME TO `comment`;--> statement-breakpoint
CREATE TABLE `__new_questView` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`linkId` text NOT NULL,
	`userId` text,
	`ipPrefix` text NOT NULL,
	`userAgent` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linkId`) REFERENCES `link`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_questView`("id", "questId", "linkId", "userId", "ipPrefix", "userAgent", "createdAt") SELECT "id", "questId", "linkId", "userId", "ipPrefix", "userAgent", "createdAt" FROM `questView`;--> statement-breakpoint
DROP TABLE `questView`;--> statement-breakpoint
ALTER TABLE `__new_questView` RENAME TO `questView`;--> statement-breakpoint
CREATE TABLE `__new_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`chatMessageId` text,
	`questHistoryId` text,
	`emailedAt` integer,
	`status` text DEFAULT 'sent' NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`chatMessageId`) REFERENCES `chatMessages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`questHistoryId`) REFERENCES `questHistory`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "notifications_pointer_xor_chk" CHECK(
        (
          ("__new_notifications"."chatMessageId" IS NOT NULL AND "__new_notifications"."questHistoryId" IS NULL)
          OR
          ("__new_notifications"."chatMessageId" IS NULL AND "__new_notifications"."questHistoryId" IS NOT NULL)
        )
      )
);
--> statement-breakpoint
INSERT INTO `__new_notifications`("id", "timestamp", "chatMessageId", "questHistoryId", "emailedAt", "status", "userId") SELECT "id", "timestamp", NULL AS "chatMessageId", "questHistoryId", "emailedAt", "status", "userId" FROM `notifications`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;--> statement-breakpoint
CREATE TABLE `__new_proposedAnswer` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`nodeId` text NOT NULL,
	`userId` text NOT NULL,
	`content` text NOT NULL,
	`screeningAnswers` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer NOT NULL,
	`decidedAt` integer,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`nodeId`) REFERENCES `node`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_proposedAnswer`("id", "questId", "nodeId", "userId", "content", "screeningAnswers", "status", "createdAt", "decidedAt") SELECT "id", "questId", "nodeId", "userId", "content", "screeningAnswers", "status", "createdAt", "decidedAt" FROM `proposedAnswer`;--> statement-breakpoint
DROP TABLE `proposedAnswer`;--> statement-breakpoint
ALTER TABLE `__new_proposedAnswer` RENAME TO `proposedAnswer`;--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_one_accepted_proposal_per_quest` ON `proposedAnswer` (`questId`) WHERE "proposedAnswer"."status" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX `unique_proposal_per_node` ON `proposedAnswer` (`nodeId`);--> statement-breakpoint
CREATE TABLE `__new_questHistory` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`actorUserId` text NOT NULL,
	`type` text NOT NULL,
	`createdAt` integer NOT NULL,
	`linkId` text,
	`nodeId` text,
	`commentId` text,
	`proposedAnswerId` text,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linkId`) REFERENCES `link`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`nodeId`) REFERENCES `node`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`commentId`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`proposedAnswerId`) REFERENCES `proposedAnswer`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "hist_ptr_reflow_chk" CHECK("__new_questHistory"."type" <> 'reflow' OR "__new_questHistory"."linkId" IS NOT NULL),
	CONSTRAINT "hist_ptr_node_chk" CHECK("__new_questHistory"."type" <> 'nodeJoined' OR "__new_questHistory"."nodeId" IS NOT NULL),
	CONSTRAINT "hist_ptr_comment_chk" CHECK("__new_questHistory"."type" <> 'commentAdded' OR "__new_questHistory"."commentId" IS NOT NULL),
	CONSTRAINT "hist_ptr_proposal_chk" CHECK(
      "__new_questHistory"."type" NOT IN ('answerProposed','answerAccepted') OR "__new_questHistory"."proposedAnswerId" IS NOT NULL
    )
);
--> statement-breakpoint
INSERT INTO `__new_questHistory`("id", "questId", "actorUserId", "type", "createdAt", "linkId", "nodeId", "commentId", "proposedAnswerId") SELECT "id", "questId", "actorUserId", "type", "createdAt", "linkId", "nodeId", "commentId", "proposedAnswerId" FROM `questHistory`;--> statement-breakpoint
DROP TABLE `questHistory`;--> statement-breakpoint
ALTER TABLE `__new_questHistory` RENAME TO `questHistory`;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_link_ins_restricted_only_targeted`
    BEFORE INSERT ON `link`
    FOR EACH ROW
    WHEN (
      (SELECT q.`type` FROM `quest` AS q WHERE q.`id` = NEW.`questId`) = 'restricted'
      AND NEW.`type` <> 'targeted'
    )
    BEGIN
      SELECT RAISE(ABORT, 'Restricted quests can only have targeted links');
    END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_link_upd_restricted_only_targeted`
    BEFORE UPDATE OF `type`, `questId` ON `link`
    FOR EACH ROW
    WHEN (
      (SELECT q.`type` FROM `quest` AS q WHERE q.`id` = NEW.`questId`) = 'restricted'
      AND NEW.`type` <> 'targeted'
    )
    BEGIN
      SELECT RAISE(ABORT, 'Restricted quests can only have targeted links');
    END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_quest_restrict_block_existing_broadcast`
    BEFORE UPDATE OF `type` ON `quest`
    FOR EACH ROW
    WHEN ('restricted' = NEW.`type` AND EXISTS (
      SELECT 1 FROM `link` l
      WHERE l.`questId` = NEW.`id` AND l.`type` <> 'targeted'
    ))
    BEGIN
      SELECT RAISE(ABORT, 'Quest cannot be set to restricted while non-targeted links exist');
    END;
PRAGMA foreign_keys=ON;
