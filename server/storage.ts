// Referenced from javascript_database blueprint - using DatabaseStorage
import { 
  topics, crawlerConfigs, crawledContent, insights, generatedContent, feedback, leads,
  type Topic, type InsertTopic,
  type CrawlerConfig, type InsertCrawlerConfig,
  type CrawledContent, type InsertCrawledContent,
  type Insight, type InsertInsight,
  type GeneratedContent, type InsertGeneratedContent,
  type Feedback, type InsertFeedback,
  type Lead, type InsertLead,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

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
  
  // Crawled Content
  getCrawledContent(): Promise<CrawledContent[]>;
  getCrawledContentByTopic(topicId: string): Promise<CrawledContent[]>;
  createCrawledContent(content: InsertCrawledContent): Promise<CrawledContent>;
  
  // Insights
  getInsights(): Promise<Insight[]>;
  getInsight(id: string): Promise<Insight | undefined>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  
  // Generated Content
  getGeneratedContent(): Promise<GeneratedContent[]>;
  getGeneratedContentByStatus(status: string): Promise<GeneratedContent[]>;
  createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  updateGeneratedContentStatus(id: string, status: string): Promise<GeneratedContent>;
  
  // Feedback
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedbackByContent(contentId: string): Promise<Feedback[]>;
  
  // Leads
  getLeads(): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<Lead>): Promise<Lead>;
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

  // Crawled Content
  async getCrawledContent(): Promise<CrawledContent[]> {
    return await db.select().from(crawledContent).orderBy(desc(crawledContent.createdAt)).limit(100);
  }

  async getCrawledContentByTopic(topicId: string): Promise<CrawledContent[]> {
    return await db.select().from(crawledContent)
      .where(eq(crawledContent.topicId, topicId))
      .orderBy(desc(crawledContent.engagementScore));
  }

  async createCrawledContent(content: InsertCrawledContent): Promise<CrawledContent> {
    const [created] = await db.insert(crawledContent).values(content).returning();
    return created;
  }

  // Insights
  async getInsights(): Promise<Insight[]> {
    return await db.select().from(insights).orderBy(desc(insights.createdAt));
  }

  async getInsight(id: string): Promise<Insight | undefined> {
    const [insight] = await db.select().from(insights).where(eq(insights.id, id));
    return insight || undefined;
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
}

export const storage = new DatabaseStorage();
