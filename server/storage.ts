// Referenced from javascript_database blueprint - using DatabaseStorage
import { 
  topics, crawlerConfigs, crawledContent, insights, generatedContent, feedback, leads, crawlerRuns, settings, users, userApiKeys,
  type Topic, type InsertTopic,
  type CrawlerConfig, type InsertCrawlerConfig,
  type CrawledContent, type InsertCrawledContent,
  type Insight, type InsertInsight,
  type GeneratedContent, type InsertGeneratedContent,
  type Feedback, type InsertFeedback,
  type Lead, type InsertLead,
  type CrawlerRun, type InsertCrawlerRun,
  type Setting, type InsertSetting,
  type User, type InsertUser,
  type UserApiKey, type InsertUserApiKey,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and } from "drizzle-orm";

export interface IStorage {
  // Topics
  getTopics(): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  
  // Crawler Configs
  getCrawlerConfigs(): Promise<CrawlerConfig[]>;
  getCrawlerConfig(id: string): Promise<CrawlerConfig | undefined>;
  createCrawlerConfig(config: InsertCrawlerConfig): Promise<CrawlerConfig>;
  updateCrawlerConfig(id: string, config: Partial<CrawlerConfig>): Promise<CrawlerConfig>;
  deleteCrawlerConfig(id: string): Promise<void>;
  
  // Crawler Runs
  createCrawlerRun(run: InsertCrawlerRun): Promise<CrawlerRun>;
  updateCrawlerRun(id: string, patch: Partial<CrawlerRun>): Promise<CrawlerRun>;
  getCrawlerRunsByConfig(configId: string, limit?: number): Promise<CrawlerRun[]>;
  
  // Crawled Content
  getCrawledContent(): Promise<CrawledContent[]>;
  getCrawledContentByTopic(topicId: string): Promise<CrawledContent[]>;
  getCrawledContentByUrl(url: string): Promise<CrawledContent | undefined>;
  getCrawledContentSince(since: Date): Promise<CrawledContent[]>;
  createCrawledContent(content: InsertCrawledContent): Promise<CrawledContent>;
  createCrawledContentIfNew(content: InsertCrawledContent): Promise<CrawledContent | undefined>;
  
  // Insights
  getInsights(): Promise<Insight[]>;
  getInsight(id: string): Promise<Insight | undefined>;
  getInsightsSince(since: Date): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  
  // Generated Content
  getGeneratedContent(): Promise<GeneratedContent[]>;
  getGeneratedContentByStatus(status: string): Promise<GeneratedContent[]>;
  getGeneratedContentById(id: string): Promise<GeneratedContent | undefined>;
  getGeneratedContentSince(since: Date): Promise<GeneratedContent[]>;
  createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  updateGeneratedContentStatus(id: string, status: string): Promise<GeneratedContent>;
  
  // Feedback
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedbackByContent(contentId: string): Promise<Feedback[]>;
  
  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsSince(since: Date): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<Lead>): Promise<Lead>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(setting: InsertSetting): Promise<Setting>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // User API Keys
  getUserApiKeys(userId: string): Promise<UserApiKey[]>;
  getUserApiKeyByService(userId: string, service: string): Promise<UserApiKey | undefined>;
  createUserApiKey(apiKey: InsertUserApiKey): Promise<UserApiKey>;
  updateUserApiKey(id: string, apiKey: Partial<UserApiKey>): Promise<UserApiKey>;
  deleteUserApiKey(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Topics
  async getTopics(): Promise<Topic[]> {
    return await db.select().from(topics).orderBy(desc(topics.createdAt));
  }

  async getTopic(id: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    return topic || undefined;
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const [topic] = await db.insert(topics).values(insertTopic).returning();
    return topic;
  }

  // Crawler Configs
  async getCrawlerConfigs(): Promise<CrawlerConfig[]> {
    return await db.select().from(crawlerConfigs).orderBy(desc(crawlerConfigs.createdAt));
  }

  async getCrawlerConfig(id: string): Promise<CrawlerConfig | undefined> {
    const [config] = await db.select().from(crawlerConfigs).where(eq(crawlerConfigs.id, id));
    return config || undefined;
  }

  async createCrawlerConfig(config: InsertCrawlerConfig): Promise<CrawlerConfig> {
    const [crawlerConfig] = await db.insert(crawlerConfigs).values(config).returning();
    return crawlerConfig;
  }

  async updateCrawlerConfig(id: string, config: Partial<CrawlerConfig>): Promise<CrawlerConfig> {
    const [updated] = await db.update(crawlerConfigs)
      .set(config)
      .where(eq(crawlerConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteCrawlerConfig(id: string): Promise<void> {
    await db.delete(crawlerConfigs).where(eq(crawlerConfigs.id, id));
  }

  // Crawler Runs
  async createCrawlerRun(run: InsertCrawlerRun): Promise<CrawlerRun> {
    const [created] = await db.insert(crawlerRuns).values(run).returning();
    return created;
  }

  async updateCrawlerRun(id: string, patch: Partial<CrawlerRun>): Promise<CrawlerRun> {
    const [updated] = await db.update(crawlerRuns)
      .set(patch)
      .where(eq(crawlerRuns.id, id))
      .returning();
    return updated;
  }

  async getCrawlerRunsByConfig(configId: string, limit = 25): Promise<CrawlerRun[]> {
    return await db.select().from(crawlerRuns)
      .where(eq(crawlerRuns.crawlerConfigId, configId))
      .orderBy(desc(crawlerRuns.startedAt))
      .limit(limit);
  }

  // Crawled Content
  async getCrawledContent(): Promise<CrawledContent[]> {
    return await db.select().from(crawledContent).orderBy(desc(crawledContent.createdAt)).limit(100);
  }

  async getCrawledContentByTopic(topicId: string): Promise<CrawledContent[]> {
    return await db.select().from(crawledContent)
      .where(eq(crawledContent.topicId, topicId))
      .orderBy(desc(crawledContent.engagementScore));
  }

  async getCrawledContentByUrl(url: string): Promise<CrawledContent | undefined> {
    const [content] = await db.select().from(crawledContent)
      .where(eq(crawledContent.url, url))
      .limit(1);
    return content || undefined;
  }

  async getCrawledContentSince(since: Date): Promise<CrawledContent[]> {
    return await db.select().from(crawledContent)
      .where(gte(crawledContent.createdAt, since))
      .orderBy(desc(crawledContent.createdAt));
  }

  async createCrawledContent(content: InsertCrawledContent): Promise<CrawledContent> {
    const [created] = await db.insert(crawledContent).values(content).returning();
    return created;
  }

  async createCrawledContentIfNew(content: InsertCrawledContent): Promise<CrawledContent | undefined> {
    if (content.url) {
      const existing = await this.getCrawledContentByUrl(content.url);
      if (existing) {
        return existing;
      }
    }
    return await this.createCrawledContent(content);
  }

  // Insights
  async getInsights(): Promise<Insight[]> {
    return await db.select().from(insights).orderBy(desc(insights.createdAt));
  }

  async getInsight(id: string): Promise<Insight | undefined> {
    const [insight] = await db.select().from(insights).where(eq(insights.id, id));
    return insight || undefined;
  }

  async getInsightsSince(since: Date): Promise<Insight[]> {
    return await db.select().from(insights)
      .where(gte(insights.createdAt, since))
      .orderBy(desc(insights.createdAt));
  }

  async createInsight(insight: InsertInsight): Promise<Insight> {
    const [created] = await db.insert(insights).values(insight).returning();
    return created;
  }

  // Generated Content
  async getGeneratedContent(): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent).orderBy(desc(generatedContent.createdAt));
  }

  async getGeneratedContentByStatus(status: string): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent)
      .where(eq(generatedContent.status, status))
      .orderBy(desc(generatedContent.createdAt));
  }

  async getGeneratedContentById(id: string): Promise<GeneratedContent | undefined> {
    const [content] = await db.select().from(generatedContent)
      .where(eq(generatedContent.id, id))
      .limit(1);
    return content || undefined;
  }

  async getGeneratedContentSince(since: Date): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent)
      .where(gte(generatedContent.createdAt, since))
      .orderBy(desc(generatedContent.createdAt));
  }

  async createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent> {
    const [created] = await db.insert(generatedContent).values(content).returning();
    return created;
  }

  async updateGeneratedContentStatus(id: string, status: string): Promise<GeneratedContent> {
    const [updated] = await db.update(generatedContent)
      .set({ status, reviewedAt: new Date() })
      .where(eq(generatedContent.id, id))
      .returning();
    return updated;
  }

  // Feedback
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedback).values(feedbackData).returning();
    return created;
  }

  async getFeedbackByContent(contentId: string): Promise<Feedback[]> {
    return await db.select().from(feedback)
      .where(eq(feedback.contentId, contentId))
      .orderBy(desc(feedback.createdAt));
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return lead || undefined;
  }

  async getLeadsSince(since: Date): Promise<Lead[]> {
    return await db.select().from(leads)
      .where(gte(leads.createdAt, since))
      .orderBy(desc(leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async updateLead(id: string, leadData: Partial<Lead>): Promise<Lead> {
    const [updated] = await db.update(leads)
      .set(leadData)
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async upsertSetting(insert: InsertSetting): Promise<Setting> {
    const [setting] = await db.insert(settings)
      .values(insert)
      .onConflictDoUpdate({ target: settings.key, set: { value: insert.value, updatedAt: new Date() } })
      .returning();
    return setting;
  }

  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || undefined;
  }

  async createUser(insert: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insert).returning();
    return user;
  }

  // User API Keys
  async getUserApiKeys(userId: string): Promise<UserApiKey[]> {
    return await db.select().from(userApiKeys).where(eq(userApiKeys.userId, userId)).orderBy(desc(userApiKeys.createdAt));
  }

  async getUserApiKeyByService(userId: string, service: string): Promise<UserApiKey | undefined> {
    const [key] = await db.select().from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.service, service), eq(userApiKeys.isActive, true)))
      .limit(1);
    return key || undefined;
  }

  async createUserApiKey(insert: InsertUserApiKey): Promise<UserApiKey> {
    const [key] = await db.insert(userApiKeys).values(insert).returning();
    return key;
  }

  async updateUserApiKey(id: string, patch: Partial<UserApiKey>): Promise<UserApiKey> {
    const [key] = await db.update(userApiKeys)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(userApiKeys.id, id))
      .returning();
    return key;
  }

  async deleteUserApiKey(id: string): Promise<void> {
    await db.delete(userApiKeys).where(eq(userApiKeys.id, id));
  }
}

export const storage = new DatabaseStorage();
