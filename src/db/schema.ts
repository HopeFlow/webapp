import {
  type AnySQLiteColumn,
  integer,
  sqliteTable,
  text,
  numeric,
  unique,
  check,
  foreignKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { relations, sql } from "drizzle-orm";
import {
  emailFrequencyDef,
  linkTypeDef,
  messageStatusDef,
  nodeStatusDef,
  questStatusDef,
  questTypeDef,
  socialMediaNames,
  updateTypeDef,
} from "./constants";
import { inList, lit } from "../helpers/server/db";
import { mirrorEnum } from "@/helpers/client/type_helpers";

const primaryKey = () =>
  text()
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID());
const timestamp = () => integer({ mode: "timestamp" });
const boolean = () => integer({ mode: "boolean" });

export type ScreeningQuestion = {
  question: string;
  answerRequired: boolean;
  answer: string;
};

export type ScreeningAnswer = { questionIndex: number; answer: string };

/**
 * ==========================
 * QUESTS
 * ==========================
 */
export const questTable = sqliteTable(
  "quest",
  {
    id: primaryKey(),
    type: text({ enum: questTypeDef }).notNull().default("unrestricted"),

    title: text().notNull(),
    shareTitle: text(),
    description: text({ mode: "json" }).notNull(), // SerializedEditorState as JSON

    rewardAmount: numeric().notNull().default("0"),
    baseBlobPath: text().notNull(),

    creationDate: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
    creatorId: text().notNull(),
    startDate: timestamp().$defaultFn(() => new Date()),
    seekerId: text(),
    status: text({ enum: questStatusDef }).notNull().default("active"),
    farewellMessage: text(),

    media: text({ mode: "json" }).$type<
      {
        url: string;
        width: number;
        height: number;
        alt: string;
        type: "image" | "video";
      }[]
    >(),

    screeningQuestions: text({ mode: "json" }).$type<ScreeningQuestion[]>(),

    reshareLabel: text(),
    proposeAnswerLabel: text(),
    saveForLaterLabel: text(),

    lastContributionAt: timestamp(),
    finishedAt: timestamp(),

    rootNodeId: text().references((): AnySQLiteColumn => nodeTable.id, {
      onDelete: "restrict",
    }),
  },
  (table) => {
    return [
      // reward non-negative
      check("quest_reward_nonneg_chk", sql`${table.rewardAmount} >= 0`),

      // temporal sanity
      check(
        "quest_finished_after_create_chk",
        sql`
        ${table.finishedAt} IS NULL OR ${table.finishedAt} >= ${table.creationDate}
      `,
      ),

      // rootNodeId must belong to THIS quest: (rootNodeId, questId) -> node(id, questId)
      foreignKey({
        name: "fk_quest_rootnode_same_quest",
        columns: [table.rootNodeId, table.id] as const,
        foreignColumns: [nodeTable.id, nodeTable.questId] as const,
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
    ];
  },
);

/**
 * ==========================
 * NODES & LINKS
 * ==========================
 */
export const nodeTable = sqliteTable(
  "node",
  {
    id: primaryKey(),
    questId: text()
      .notNull()
      .references((): AnySQLiteColumn => questTable.id, {
        onDelete: "cascade",
      }),
    seekerId: text().notNull(),
    userId: text().notNull(),
    referer: text({ enum: socialMediaNames }).notNull().default("unknown"),
    status: text({ enum: nodeStatusDef }).notNull(),
    parentId: text().references((): AnySQLiteColumn => nodeTable.id, {
      onDelete: "cascade",
    }),
    viewLinkId: text().references((): AnySQLiteColumn => linkTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table): any[] => {
    return [
      unique("quest_id_user_id_unique").on(table.questId, table.userId),
      // Composite FK to guarantee viewLink belongs to same quest
      foreignKey({
        name: "fk_node_viewlink_same_quest",
        columns: [table.viewLinkId, table.questId] as [
          AnySQLiteColumn,
          AnySQLiteColumn,
        ],
        foreignColumns: [linkTable.id, linkTable.questId] as [
          AnySQLiteColumn,
          AnySQLiteColumn,
        ],
      })
        .onUpdate("cascade")
        .onDelete("set null"),

      // (id, questId) unique so others can safely reference node(id, questId)
      uniqueIndex("node_id_quest_unique").on(table.id, table.questId),

      // Only one root node per quest (parentId is NULL)
      uniqueIndex("uniq_one_root_node_per_quest")
        .on(table.questId)
        .where(sql`${table.parentId} IS NULL`),
    ];
  },
);

export const linkTable = sqliteTable(
  "link",
  {
    id: primaryKey(),
    questId: text()
      .notNull()
      .references((): AnySQLiteColumn => questTable.id, {
        onDelete: "cascade",
      }),
    ownerNodeId: text()
      .notNull()
      .references((): AnySQLiteColumn => nodeTable.id, { onDelete: "cascade" }),

    type: text({ enum: linkTypeDef }).notNull().default("targeted"),
    name: text(),
    endorsement: text(),
    reason: text(),
    relationshipStrength: integer(), // 1..5 (enforce in app or via CHECK in raw SQL)

    linkCode: text().notNull(),
    active: boolean().default(true),

    createdAt: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => {
    const LinkType = mirrorEnum(linkTypeDef);
    return [
      unique("unique_link_code").on(table.linkCode),
      // targeted => relationshipStrength 1..5 ; broadcast => must be NULL
      check(
        "link_relationship_strength_chk",
        sql`
      ( ${table.type} = ${lit(LinkType.targeted)} AND ${
          table.relationshipStrength
        } BETWEEN 1 AND 5 )
      OR ( ${table.type} <> ${lit(LinkType.targeted)} AND ${
          table.relationshipStrength
        } IS NULL )
    `,
      ),

      // Ensure owner node is from same quest: (ownerNodeId, questId) -> node(id, questId)
      foreignKey(() => ({
        name: "fk_link_owner_same_quest",
        columns: [table.ownerNodeId, table.questId] as [
          AnySQLiteColumn,
          AnySQLiteColumn,
        ],
        foreignColumns: [nodeTable.id, nodeTable.questId] as [
          AnySQLiteColumn,
          AnySQLiteColumn,
        ],
      }))
        .onUpdate("cascade")
        .onDelete("cascade"),

      // Expose composite key for other FKs (e.g., node.viewLinkId, questUserRelation)
      uniqueIndex("link_id_quest_unique").on(table.id, table.questId),
    ];
  },
);

/**
 * ==========================
 * COMMENTS
 * ==========================
 */
export const commentTable = sqliteTable(
  "comment",
  {
    id: primaryKey(),
    questId: text()
      .notNull()
      .references((): AnySQLiteColumn => questTable.id, {
        onDelete: "cascade",
      }),
    nodeId: text()
      .notNull()
      .references((): AnySQLiteColumn => nodeTable.id, { onDelete: "cascade" }),
    userId: text().notNull(),
    likedBy: text({ mode: "json" }).$type<string[]>(), // JSON string array
    dislikedBy: text({ mode: "json" }).$type<string[]>(), // JSON string array
    content: text().notNull(),
    createdAt: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => {
    return [
      // ensure JSON is valid (requires SQLite json1)
      check("comment_likedBy_json_valid", sql`json_valid(${table.likedBy})`),
      check(
        "comment_dislikedBy_json_valid",
        sql`json_valid(${table.dislikedBy})`,
      ),
    ];
  },
);

/**
 * ==========================
 * QUEST HISTORY (activity feed)
 * ==========================
 */
export const questHistoryTable = sqliteTable(
  "questHistory",
  {
    id: primaryKey(),
    questId: text()
      .notNull()
      .references((): AnySQLiteColumn => questTable.id, {
        onDelete: "cascade",
      }),
    actorUserId: text().notNull(),
    type: text({ enum: updateTypeDef }).notNull(),
    createdAt: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
    linkId: text().references((): AnySQLiteColumn => linkTable.id, {
      onDelete: "set null",
    }),
    nodeId: text().references((): AnySQLiteColumn => nodeTable.id, {
      onDelete: "set null",
    }),
    commentId: text().references((): AnySQLiteColumn => commentTable.id, {
      onDelete: "set null",
    }),
    proposedAnswerId: text().references(
      (): AnySQLiteColumn => proposedAnswerTable.id,
      { onDelete: "set null" },
    ),
  },
  (table) => {
    const UpdateType = mirrorEnum(updateTypeDef);

    const proposalTypes = [
      UpdateType.answerProposed,
      UpdateType.answerAccepted,
      UpdateType.answerRejected,
    ] as const;
    return [
      // Require the right FK depending on the type
      check(
        "hist_ptr_reflow_chk",
        sql`${table.type} <> ${lit(UpdateType.reflow)} OR ${
          table.linkId
        } IS NOT NULL`,
      ),
      check(
        "hist_ptr_node_chk",
        sql`${table.type} <> ${lit(UpdateType.nodeJoined)} OR ${
          table.nodeId
        } IS NOT NULL`,
      ),
      check(
        "hist_ptr_comment_chk",
        sql`${table.type} <> ${lit(UpdateType.commentAdded)} OR ${
          table.commentId
        } IS NOT NULL`,
      ),
      check(
        "hist_ptr_proposal_chk",
        sql`
      ${table.type} NOT IN (${inList(proposalTypes)}) OR ${
          table.proposedAnswerId
        } IS NOT NULL
    `,
      ),
    ];
  },
);

/**
 * ==========================
 * QUEST USER RELATION
 * ==========================
 */
export const questUserRelationTable = sqliteTable(
  "questUserRelation",
  {
    id: primaryKey(),
    questId: text()
      .notNull()
      .references((): AnySQLiteColumn => questTable.id, {
        onDelete: "cascade",
      }),
    linkId: text()
      .notNull()
      .references((): AnySQLiteColumn => linkTable.id, { onDelete: "cascade" }),
    nodeId: text().references((): AnySQLiteColumn => nodeTable.id, {
      onDelete: "cascade",
    }), // null: bookmarked; =root: seeker; else contributor
    userId: text().notNull(),
    createdAt: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => {
    return [
      // Enforce link belongs to quest
      foreignKey({
        name: "fk_qur_link_same_quest",
        columns: [table.linkId, table.questId] as const,
        foreignColumns: [linkTable.id, linkTable.questId] as const,
      })
        .onUpdate("cascade")
        .onDelete("cascade"),

      // If node present, enforce node belongs to quest
      foreignKey({
        name: "fk_qur_node_same_quest",
        columns: [table.nodeId, table.questId] as const,
        foreignColumns: [nodeTable.id, nodeTable.questId] as const,
      })
        .onUpdate("cascade")
        .onDelete("cascade"),
    ];
  },
);

/**
 * ==========================
 * PROPOSED ANSWERS
 * ==========================
 */
export const proposedAnswerStatus = [
  "pending",
  "accepted",
  "rejected",
] as const;

export const proposedAnswerTable = sqliteTable(
  "proposedAnswer",
  {
    id: primaryKey(),
    questId: text()
      .notNull()
      .references((): AnySQLiteColumn => questTable.id, {
        onDelete: "cascade",
      }),
    nodeId: text()
      .notNull()
      .references((): AnySQLiteColumn => nodeTable.id, { onDelete: "cascade" }),
    userId: text().notNull(),
    content: text().notNull(),
    screeningAnswers: text({ mode: "json" })
      .$type<ScreeningAnswer[]>()
      .notNull(),
    status: text({ enum: proposedAnswerStatus }).notNull().default("pending"),
    createdAt: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
    decidedAt: timestamp(),
  },
  (table) => {
    const ProposedAnswerStatus = mirrorEnum(proposedAnswerStatus);
    return [
      unique("unique_proposal_per_node").on(table.nodeId),

      // Only one accepted proposal per quest
      uniqueIndex("uniq_one_accepted_proposal_per_quest")
        .on(table.questId)
        .where(sql`${table.status} = ${lit(ProposedAnswerStatus.accepted)}`),
    ];
  },
);

/**
 * ==========================
 * CHAT & NOTIFICATIONS
 * ==========================
 */
export const chatMessagesTable = sqliteTable("chatMessages", {
  id: primaryKey(),
  questId: text()
    .notNull()
    .references((): AnySQLiteColumn => questTable.id, { onDelete: "cascade" }),
  nodeId: text()
    .notNull()
    .references((): AnySQLiteColumn => nodeTable.id, { onDelete: "cascade" }),
  userId: text().notNull(),
  content: text().notNull(),
  timestamp: timestamp().notNull(),
  status: text({ enum: messageStatusDef }).notNull().default("sent"),
});

export const notificationsTable = sqliteTable("notifications", {
  id: primaryKey(),
  timestamp: timestamp().notNull(),
  questHistoryId: text().references(
    (): AnySQLiteColumn => questHistoryTable.id,
    {
      onDelete: "set null",
    },
  ),
  emailedAt: timestamp(),
  status: text({ enum: messageStatusDef }).notNull().default("sent"),
  userId: text().notNull(),
});

export const userProfileTable = sqliteTable("userProfile", {
  userId: text().primaryKey().notNull(),
  emailEnabled: boolean().notNull().default(true),
  credence: numeric().notNull().default("0"),
  emailFrequency: text({ enum: emailFrequencyDef }).notNull().default("daily"),
  lastSentAt: timestamp(),
  timezone: text(),
});

/**
 * ==========================
 * Relations (same API)
 * ==========================
 */
export const questRelations = relations(questTable, ({ one, many }) => ({
  rootNode: one(nodeTable, {
    fields: [questTable.rootNodeId],
    references: [nodeTable.id],
  }),
  nodes: many(nodeTable),
  links: many(linkTable),
  comments: many(commentTable),
  histories: many(questHistoryTable),
  userRelations: many(questUserRelationTable),
  proposedAnswers: many(proposedAnswerTable),
  chatMessages: many(chatMessagesTable),
}));

export const nodeRelations = relations(nodeTable, ({ one, many }) => ({
  quest: one(questTable, {
    fields: [nodeTable.questId],
    references: [questTable.id],
  }),
  parent: one(nodeTable, {
    fields: [nodeTable.parentId],
    references: [nodeTable.id],
  }),
  viewLink: one(linkTable, {
    fields: [nodeTable.viewLinkId],
    references: [linkTable.id],
  }),
  ownedLinks: many(linkTable),
  comments: many(commentTable),
  histories: many(questHistoryTable),
  proposedAnswers: many(proposedAnswerTable),
  chatMessages: many(chatMessagesTable),
  questUserRelations: many(questUserRelationTable),
}));

export const linkRelations = relations(linkTable, ({ one, many }) => ({
  quest: one(questTable, {
    fields: [linkTable.questId],
    references: [questTable.id],
  }),
  ownerNode: one(nodeTable, {
    fields: [linkTable.ownerNodeId],
    references: [nodeTable.id],
  }),
  usedByNodes: many(nodeTable),
  histories: many(questHistoryTable),
  userRelations: many(questUserRelationTable),
}));

export const commentRelations = relations(commentTable, ({ one, many }) => ({
  quest: one(questTable, {
    fields: [commentTable.questId],
    references: [questTable.id],
  }),
  node: one(nodeTable, {
    fields: [commentTable.nodeId],
    references: [nodeTable.id],
  }),
  histories: many(questHistoryTable),
}));

export const questHistoryRelations = relations(
  questHistoryTable,
  ({ one }) => ({
    quest: one(questTable, {
      fields: [questHistoryTable.questId],
      references: [questTable.id],
    }),
    link: one(linkTable, {
      fields: [questHistoryTable.linkId],
      references: [linkTable.id],
    }),
    node: one(nodeTable, {
      fields: [questHistoryTable.nodeId],
      references: [nodeTable.id],
    }),
    comment: one(commentTable, {
      fields: [questHistoryTable.commentId],
      references: [commentTable.id],
    }),
    proposedAnswer: one(proposedAnswerTable, {
      fields: [questHistoryTable.proposedAnswerId],
      references: [proposedAnswerTable.id],
    }),
  }),
);

export const questUserRelationRelations = relations(
  questUserRelationTable,
  ({ one }) => ({
    quest: one(questTable, {
      fields: [questUserRelationTable.questId],
      references: [questTable.id],
    }),
    link: one(linkTable, {
      fields: [questUserRelationTable.linkId],
      references: [linkTable.id],
    }),
    node: one(nodeTable, {
      fields: [questUserRelationTable.nodeId],
      references: [nodeTable.id],
    }),
  }),
);

export const proposedAnswerRelations = relations(
  proposedAnswerTable,
  ({ one, many }) => ({
    quest: one(questTable, {
      fields: [proposedAnswerTable.questId],
      references: [questTable.id],
    }),
    node: one(nodeTable, {
      fields: [proposedAnswerTable.nodeId],
      references: [nodeTable.id],
    }),
    histories: many(questHistoryTable),
  }),
);

export const chatMessagesRelations = relations(
  chatMessagesTable,
  ({ one }) => ({
    quest: one(questTable, {
      fields: [chatMessagesTable.questId],
      references: [questTable.id],
    }),
    node: one(nodeTable, {
      fields: [chatMessagesTable.nodeId],
      references: [nodeTable.id],
    }),
  }),
);

export const notificationRelations = relations(
  notificationsTable,
  ({ one }) => ({
    history: one(questHistoryTable, {
      fields: [notificationsTable.questHistoryId],
      references: [questHistoryTable.id],
    }),
  }),
);

export const userProfileRelations = relations(userProfileTable, () => ({}));
