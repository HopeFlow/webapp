CREATE TABLE `bookmark` (
	`id` text PRIMARY KEY NOT NULL,
	`questId` text NOT NULL,
	`userId` text NOT NULL,
	`linkId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`questId`) REFERENCES `quest`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linkId`) REFERENCES `link`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linkId`,`questId`) REFERENCES `link`(`id`,`questId`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_bookmark_per_user_per_quest` ON `bookmark` (`questId`,`userId`);--> statement-breakpoint
CREATE TABLE `chatMessages` (
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
CREATE TABLE `comment` (
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
	CONSTRAINT "comment_likedBy_json_valid" CHECK(json_valid("comment"."likedBy")),
	CONSTRAINT "comment_dislikedBy_json_valid" CHECK(json_valid("comment"."dislikedBy"))
);
--> statement-breakpoint
CREATE TABLE `link` (
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
      ( "link"."type" = 'targeted' AND "link"."relationshipStrength" BETWEEN 1 AND 5 )
      OR ( "link"."type" <> 'targeted' AND "link"."relationshipStrength" IS NULL )
    )
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_id_quest_unique` ON `link` (`id`,`questId`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_link_code` ON `link` (`linkCode`);--> statement-breakpoint
CREATE TABLE `node` (
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
CREATE UNIQUE INDEX `node_id_quest_unique` ON `node` (`id`,`questId`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_one_root_node_per_quest` ON `node` (`questId`) WHERE "node"."parentId" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `quest_id_user_id_unique` ON `node` (`questId`,`userId`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`questHistoryId` text,
	`emailedAt` integer,
	`status` text DEFAULT 'sent' NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`questHistoryId`) REFERENCES `questHistory`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `proposedAnswer` (
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
CREATE UNIQUE INDEX `uniq_one_accepted_proposal_per_quest` ON `proposedAnswer` (`questId`) WHERE "proposedAnswer"."status" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX `unique_proposal_per_node` ON `proposedAnswer` (`nodeId`);--> statement-breakpoint
CREATE TABLE `questHistory` (
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
	CONSTRAINT "hist_ptr_reflow_chk" CHECK("questHistory"."type" <> 'reflow' OR "questHistory"."linkId" IS NOT NULL),
	CONSTRAINT "hist_ptr_node_chk" CHECK("questHistory"."type" <> 'nodeJoined' OR "questHistory"."nodeId" IS NOT NULL),
	CONSTRAINT "hist_ptr_comment_chk" CHECK("questHistory"."type" <> 'commentAdded' OR "questHistory"."commentId" IS NOT NULL),
	CONSTRAINT "hist_ptr_proposal_chk" CHECK(
      "questHistory"."type" NOT IN ('answerProposed','answerAccepted','answerRejected') OR "questHistory"."proposedAnswerId" IS NOT NULL
    )
);
--> statement-breakpoint
CREATE TABLE `quest` (
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
	CONSTRAINT "quest_reward_nonneg_chk" CHECK("quest"."rewardAmount" >= 0),
	CONSTRAINT "quest_coverphoto_aspect_ratio_chk" CHECK(
        json_type("quest"."coverPhoto", '$.width') IN ('integer','real') AND
        json_type("quest"."coverPhoto", '$.height') IN ('integer','real') AND
        json_extract("quest"."coverPhoto", '$.width') > 0 AND
        json_extract("quest"."coverPhoto", '$.height') > 0 AND
        (json_extract("quest"."coverPhoto", '$.width') * 9) =
        (json_extract("quest"."coverPhoto", '$.height') * 16)
      ),
	CONSTRAINT "quest_finished_after_create_chk" CHECK(
        "quest"."finishedAt" IS NULL OR "quest"."finishedAt" >= "quest"."creationDate"
      )
);
--> statement-breakpoint
CREATE TABLE `questView` (
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
CREATE TABLE `userProfile` (
	`userId` text PRIMARY KEY NOT NULL,
	`emailEnabled` integer DEFAULT true NOT NULL,
	`credence` numeric DEFAULT '0' NOT NULL,
	`emailFrequency` text DEFAULT 'daily' NOT NULL,
	`lastSentAt` integer,
	`timezone` text DEFAULT 'Europe/Berlin' NOT NULL,
	`asciiName` text DEFAULT '' NOT NULL
);
