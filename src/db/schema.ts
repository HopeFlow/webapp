import {
  type AnySQLiteColumn,
  integer,
  sqliteTable,
  text,
  numeric,
  unique,
} from "drizzle-orm/sqlite-core";

import { relations } from "drizzle-orm";
import {
  chatMessageSentByDef,
  defaultShareLinkType,
  emailFrequencyDef,
  messageStatusDef,
  nodeStatusDef,
  questStatusDef,
  reflowTargetRelationDef,
  socialMediaNames,
} from "./constants";

const primaryKey = () =>
  text()
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID());
const timestamp = () => integer({ mode: "timestamp" });
const boolean = () => integer({ mode: "boolean" });

export const questTable = sqliteTable("quest", {
  id: primaryKey(),
  category: text().notNull(),
  purpose: text().notNull(),
  title: text().notNull(),
  description: text().notNull(),
  coverPhotoUrl: text(),
  coverYTVideoUrl: text(),
  rewardAmount: numeric().notNull(),
  baseBlobPath: text().notNull(),
  defaultShareLinkType: text({ enum: defaultShareLinkType })
    .default("targeted")
    .notNull(),
  creatorId: text().notNull(),
  startDate: timestamp()
    .notNull()
    .$defaultFn(() => new Date()),
  starterId: text(),
  dueDate: timestamp().notNull(),
  status: text({ enum: questStatusDef }).notNull().default("active"),
  terminationReason: text(),
  rootNodeId: text().references((): AnySQLiteColumn => nodeTable.id, {
    onDelete: "restrict",
  }),
});

export const nodeTable = sqliteTable(
  "node",
  {
    id: primaryKey(),
    questId: text()
      .notNull()
      .references(() => questTable.id),
    starterId: text().notNull(),
    userId: text().notNull(),
    referer: text({ enum: socialMediaNames }).notNull().default("unknown"),
    status: text({ enum: nodeStatusDef }).notNull().default("contributed"),
    parentId: text().references((): AnySQLiteColumn => nodeTable.id, {
      onDelete: "cascade",
    }),
    viewLinkId: text().references(() => linkTable.id),
    creationDate: timestamp()
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => {
    return [unique("quest_id_user_id_unique").on(table.questId, table.userId)];
  }
);

export const linkTable = sqliteTable("link", {
  id: primaryKey(),
  questId: text()
    .notNull()
    .references(() => questTable.id),
  ownerNodeId: text()
    .notNull()
    .references((): AnySQLiteColumn => nodeTable.id),
  type: text({ enum: defaultShareLinkType }).notNull().default("targeted"),
  name: text(),
  reason: text(),
  relation: text({ enum: reflowTargetRelationDef }),
  linkCode: text().notNull(),
  active: boolean().default(true),
  creationDate: timestamp()
    .notNull()
    .$defaultFn(() => new Date()),
});

export const chatMessagesTable = sqliteTable("chatMessages", {
  id: primaryKey(),
  questId: text()
    .notNull()
    .references(() => questTable.id),
  nodeId: text()
    .notNull()
    .references(() => nodeTable.id),
  contributorId: text().notNull(),
  sentBy: text({ enum: chatMessageSentByDef }).notNull(),
  content: text().notNull(),
  timestamp: timestamp().notNull(),
  status: text({ enum: messageStatusDef }).notNull().default("sent"),
});

export const notificationsTable = sqliteTable("notifications", {
  id: primaryKey(),
  timestamp: timestamp().notNull(),
  status: text({ enum: messageStatusDef }).notNull().default("sent"),
  data: text({ mode: "json" }).notNull(),
  actions: text({ mode: "json" }).notNull(),
  targetUserId: text().notNull(),
});

export const userProfileTable = sqliteTable("userProfile", {
  userId: text().primaryKey().notNull(),
  emailEnabled: boolean().notNull().default(true),
  emailFrequency: text({ enum: emailFrequencyDef }).notNull().default("daily"),
  lastSentAt: integer({
    mode: "timestamp",
  }),
  timezone: text(),
});

export const questRelations = relations(questTable, ({ many, one }) => ({
  nodes: many(nodeTable),
  links: many(linkTable),
  chatMessages: many(chatMessagesTable),
  creator: one(userProfileTable, {
    fields: [questTable.creatorId],
    references: [userProfileTable.userId],
  }),
  starter: one(userProfileTable, {
    fields: [questTable.starterId],
    references: [userProfileTable.userId],
  }),
}));

export const nodeRelations = relations(nodeTable, ({ one, many }) => ({
  // Existing relations
  quest: one(questTable, {
    fields: [nodeTable.questId],
    references: [questTable.id],
  }),
  parent: one(nodeTable, {
    fields: [nodeTable.parentId],
    references: [nodeTable.id],
    relationName: "parent",
  }),
  children: many(nodeTable),
  links: many(linkTable),
  viewLink: one(linkTable, {
    fields: [nodeTable.viewLinkId],
    references: [linkTable.id],
  }),
  chatMessages: many(chatMessagesTable),
  user: one(userProfileTable, {
    fields: [nodeTable.userId],
    references: [userProfileTable.userId],
  }),
  starter: one(userProfileTable, {
    fields: [nodeTable.starterId],
    references: [userProfileTable.userId],
  }),
}));

export const linkRelations = relations(linkTable, ({ one }) => ({
  quest: one(questTable, {
    fields: [linkTable.questId],
    references: [questTable.id],
  }),
  ownerNode: one(nodeTable, {
    fields: [linkTable.ownerNodeId],
    references: [nodeTable.id],
  }),
}));

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
    contributor: one(userProfileTable, {
      fields: [chatMessagesTable.contributorId],
      references: [userProfileTable.userId],
    }),
  })
);

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    targetUser: one(userProfileTable, {
      fields: [notificationsTable.targetUserId],
      references: [userProfileTable.userId],
    }),
  })
);

export const userProfileRelations = relations(userProfileTable, ({ many }) => ({
  // Nodes where this user is node.userId
  nodes: many(nodeTable),
  // Nodes where this user is node.starterId
  startedNodes: many(nodeTable),
  // Quests where this user is quest.creatorId
  createdQuests: many(questTable),
  // Quests where this user is quest.starterId
  startedQuests: many(questTable),
  // Chat messages contributed by this user
  chatMessages: many(chatMessagesTable),
  // Notifications targeted to this user
  notifications: many(notificationsTable),
}));
