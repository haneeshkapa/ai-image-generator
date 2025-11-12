import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Topics for content categorization
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icpFitScore: integer("icp_fit_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Crawler configuration
export const crawlerConfigs = pgTable("crawler_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // reddit, youtube, twitter, blog, etc
  sourceUrl: text("source_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  crawlFrequency: text("crawl_frequency").default("daily").notNull(), // hourly, daily, weekly
  lastCrawledAt: timestamp("last_crawled_at"),
  topicId: varchar("topic_id").references(() => topics.id),
  config: jsonb("config"), // platform-specific config like rate limits, filters
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crawlerRuns = pgTable("crawler_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crawlerConfigId: varchar("crawler_config_id").references(() => crawlerConfigs.id).notNull(),
  status: text("status").notNull(),
  itemsIngested: integer("items_ingested").default(0),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  metadata: jsonb("metadata"),
});

// Crawled content from various sources
export const crawledContent = pgTable("crawled_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crawlerConfigId: varchar("crawler_config_id").references(() => crawlerConfigs.id),
  topicId: varchar("topic_id").references(() => topics.id),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(), // post, video, article, tweet
  title: text("title"),
  contentText: text("content_text"),
  url: text("url").notNull(),
  author: text("author"),
  publishedAt: timestamp("published_at"),
  
  // Engagement metrics
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  engagementScore: integer("engagement_score").default(0), // computed metric
  
  // Metadata
  metadata: jsonb("metadata"), // platform-specific additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI-generated insights comparing content
export const insights = pgTable("insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id").references(() => topics.id),
  insightType: text("insight_type").notNull(), // comparative, trend, opportunity
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  
  // References to content being analyzed
  highPerformerIds: text("high_performer_ids").array(), // array of content IDs
  lowPerformerIds: text("low_performer_ids").array(),
  
  // Key differentiators identified
  differentiators: jsonb("differentiators"), // structured data about what works
  confidence: integer("confidence").default(0), // 0-100
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI-generated content drafts
export const generatedContent = pgTable("generated_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightId: varchar("insight_id").references(() => insights.id),
  topicId: varchar("topic_id").references(() => topics.id),
  
  platform: text("platform").notNull(), // reddit, youtube, email, twitter
  contentType: text("content_type").notNull(), // text_post, email_script, video_outline, image, video
  
  title: text("title"),
  content: text("content").notNull(),
  
  // Media generation fields
  mediaUrl: text("media_url"), // URL to generated image/video
  mediaType: text("media_type"), // image, video, null for text content
  mediaMetadata: jsonb("media_metadata"), // generation params, dimensions, duration, etc
  
  // AI critic evaluation
  clarityScore: integer("clarity_score"), // 0-100
  hookStrength: integer("hook_strength"), // 0-100
  alignmentScore: integer("alignment_score"), // 0-100
  
  // Approval workflow
  status: text("status").default("pending").notNull(), // pending, approved, revised, rejected
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// Human feedback on generated content
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").references(() => generatedContent.id).notNull(),
  
  action: text("action").notNull(), // approve, revise, reject
  rationale: text("rationale"), // free-text explanation
  
  // Structured preference data
  preferenceData: jsonb("preference_data"), // what they liked/disliked
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// HubSpot leads created from high-engagement content
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").references(() => generatedContent.id),
  
  hubspotContactId: text("hubspot_contact_id"),
  email: text("email"),
  name: text("name"),
  
  source: text("source"), // which content/platform generated this lead
  icpScore: integer("icp_score").default(0), // 0-100
  qualificationStatus: text("qualification_status").default("new").notNull(), // new, qualified, contacted, booked
  bookingUrl: text("booking_url"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  contactedAt: timestamp("contacted_at"),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userApiKeys = pgTable("user_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  service: text("service").notNull(), // openai, youtube, hubspot, reddit, calcom
  encryptedKey: text("encrypted_key").notNull(),
  keyName: text("key_name"), // optional friendly name
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const topicsRelations = relations(topics, ({ many }) => ({
  crawlerConfigs: many(crawlerConfigs),
  crawledContent: many(crawledContent),
  insights: many(insights),
  generatedContent: many(generatedContent),
}));

export const crawlerConfigsRelations = relations(crawlerConfigs, ({ one, many }) => ({
  topic: one(topics, {
    fields: [crawlerConfigs.topicId],
    references: [topics.id],
  }),
  crawledContent: many(crawledContent),
  runs: many(crawlerRuns),
}));

export const crawlerRunsRelations = relations(crawlerRuns, ({ one }) => ({
  crawlerConfig: one(crawlerConfigs, {
    fields: [crawlerRuns.crawlerConfigId],
    references: [crawlerConfigs.id],
  }),
}));

export const crawledContentRelations = relations(crawledContent, ({ one }) => ({
  crawlerConfig: one(crawlerConfigs, {
    fields: [crawledContent.crawlerConfigId],
    references: [crawlerConfigs.id],
  }),
  topic: one(topics, {
    fields: [crawledContent.topicId],
    references: [topics.id],
  }),
}));

export const insightsRelations = relations(insights, ({ one, many }) => ({
  topic: one(topics, {
    fields: [insights.topicId],
    references: [topics.id],
  }),
  generatedContent: many(generatedContent),
}));

export const generatedContentRelations = relations(generatedContent, ({ one, many }) => ({
  insight: one(insights, {
    fields: [generatedContent.insightId],
    references: [insights.id],
  }),
  topic: one(topics, {
    fields: [generatedContent.topicId],
    references: [topics.id],
  }),
  feedback: many(feedback),
  leads: many(leads),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  content: one(generatedContent, {
    fields: [feedback.contentId],
    references: [generatedContent.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  content: one(generatedContent, {
    fields: [leads.contentId],
    references: [generatedContent.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(userApiKeys),
}));

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertTopicSchema = createInsertSchema(topics).omit({ id: true, createdAt: true });
export const insertCrawlerConfigSchema = createInsertSchema(crawlerConfigs).omit({ id: true, createdAt: true, lastCrawledAt: true });
export const insertCrawlerRunSchema = createInsertSchema(crawlerRuns).omit({ id: true, startedAt: true, finishedAt: true });
export const insertCrawledContentSchema = createInsertSchema(crawledContent).omit({ id: true, createdAt: true });
export const insertInsightSchema = createInsertSchema(insights).omit({ id: true, createdAt: true });
export const insertGeneratedContentSchema = createInsertSchema(generatedContent).omit({ id: true, createdAt: true, reviewedAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, contactedAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserApiKeySchema = createInsertSchema(userApiKeys).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type CrawlerConfig = typeof crawlerConfigs.$inferSelect;
export type InsertCrawlerConfig = z.infer<typeof insertCrawlerConfigSchema>;

export type CrawledContent = typeof crawledContent.$inferSelect;
export type InsertCrawledContent = z.infer<typeof insertCrawledContentSchema>;

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type CrawlerRun = typeof crawlerRuns.$inferSelect;
export type InsertCrawlerRun = z.infer<typeof insertCrawlerRunSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserApiKey = typeof userApiKeys.$inferSelect;
export type InsertUserApiKey = z.infer<typeof insertUserApiKeySchema>;
