import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateInsight, generateContent } from "./openai";
import { createHubSpotContact } from "./integrations/hubspot";
import { insertCrawlerConfigSchema, insertCrawledContentSchema, insertInsightSchema, insertGeneratedContentSchema, insertFeedbackSchema, insertLeadSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const [crawlers, insights, content, leads] = await Promise.all([
        storage.getCrawlerConfigs(),
        storage.getInsights(),
        storage.getGeneratedContent(),
        storage.getLeads(),
      ]);

      const approvedContent = content.filter(c => c.status === "approved");
      const qualifiedLeads = leads.filter(l => l.qualificationStatus === "qualified" || l.qualificationStatus === "booked");

      res.json({
        crawlersSessions: crawlers.filter(c => c.isActive).length,
        insightsGenerated: insights.length,
        contentApproved: approvedContent.length,
        leadsQualified: qualifiedLeads.length,
        approvalRate: content.length > 0 ? Math.round((approvedContent.length / content.length) * 100) : 0,
        avgResponseTime: 2.3,
      });
    } catch (error: any) {
      console.error("[API] Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats", details: error.message });
    }
  });

  // Topics
  app.get("/api/topics", async (req, res) => {
    try {
      const topics = await storage.getTopics();
      res.json(topics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Crawlers
  app.get("/api/crawlers", async (req, res) => {
    try {
      const crawlers = await storage.getCrawlerConfigs();
      res.json(crawlers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/crawlers", async (req, res) => {
    try {
      const validated = insertCrawlerConfigSchema.parse(req.body);
      const crawler = await storage.createCrawlerConfig(validated);
      res.json(crawler);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/crawlers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const crawler = await storage.updateCrawlerConfig(id, req.body);
      res.json(crawler);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/crawlers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCrawlerConfig(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Crawled content
  app.get("/api/content/crawled", async (req, res) => {
    try {
      const content = await storage.getCrawledContent();
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/content/crawled", async (req, res) => {
    try {
      const validated = insertCrawledContentSchema.parse(req.body);
      const content = await storage.createCrawledContent(validated);
      res.json(content);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Insights
  app.get("/api/insights", async (req, res) => {
    try {
      const insights = await storage.getInsights();
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/insights/generate", async (req, res) => {
    try {
      const { topicId } = req.body;
      
      if (!topicId) {
        return res.status(400).json({ error: "Topic ID is required" });
      }
      
      // Get content for this topic
      const allContent = await storage.getCrawledContentByTopic(topicId);
      
      if (allContent.length < 10) {
        return res.status(400).json({ 
          error: "Not enough data", 
          message: `Need at least 10 content items to generate insights. Currently have ${allContent.length}.`
        });
      }

      // Sort by engagement and split into high/low performers
      const sorted = allContent.sort((a, b) => b.engagementScore - a.engagementScore);
      const highPerformers = sorted.slice(0, Math.floor(sorted.length * 0.3));
      const lowPerformers = sorted.slice(-Math.floor(sorted.length * 0.3));

      console.log(`[API] Generating insight for topic ${topicId} with ${highPerformers.length} high and ${lowPerformers.length} low performers`);

      // Generate insight using OpenAI
      const insightData = await generateInsight(highPerformers, lowPerformers, topicId);

      // Save to database
      const insight = await storage.createInsight({
        topicId,
        insightType: "comparative",
        title: insightData.title,
        summary: insightData.summary,
        highPerformerIds: highPerformers.map(c => c.id),
        lowPerformerIds: lowPerformers.map(c => c.id),
        differentiators: insightData.differentiators,
        confidence: insightData.confidence,
      });

      console.log(`[API] Created insight ${insight.id} with ${insight.confidence}% confidence`);
      res.json(insight);
    } catch (error: any) {
      console.error("[API] Insight generation error:", error);
      res.status(500).json({ error: "Failed to generate insight", details: error.message });
    }
  });

  // Generated content
  app.get("/api/content/generated", async (req, res) => {
    try {
      const content = await storage.getGeneratedContent();
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/content/generate", async (req, res) => {
    try {
      const { insightId, platform, contentType, topicId } = req.body;
      
      if (!insightId || !platform || !contentType) {
        return res.status(400).json({ 
          error: "Missing required fields", 
          message: "insightId, platform, and contentType are required"
        });
      }
      
      // Get the insight
      const insight = await storage.getInsight(insightId);
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }

      console.log(`[API] Generating ${contentType} for ${platform} based on insight ${insightId}`);

      // Generate content using OpenAI
      const contentData = await generateContent(insight, platform, contentType);

      // Save to database
      const generated = await storage.createGeneratedContent({
        insightId,
        topicId: topicId || insight.topicId,
        platform,
        contentType,
        title: contentData.title,
        content: contentData.content,
        clarityScore: contentData.scores.clarity,
        hookStrength: contentData.scores.hook,
        alignmentScore: contentData.scores.alignment,
        status: "pending",
      });

      console.log(`[API] Created content ${generated.id} with scores: clarity=${generated.clarityScore}, hook=${generated.hookStrength}, alignment=${generated.alignmentScore}`);
      res.json(generated);
    } catch (error: any) {
      console.error("[API] Content generation error:", error);
      res.status(500).json({ error: "Failed to generate content", details: error.message });
    }
  });

  // Feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const validated = insertFeedbackSchema.parse(req.body);
      const { contentId, action } = validated;

      console.log(`[API] Processing ${action} feedback for content ${contentId}`);

      // Update content status based on action
      let newStatus = "pending";
      if (action === "approve") newStatus = "approved";
      else if (action === "revise") newStatus = "revised";
      else if (action === "reject") newStatus = "rejected";

      await storage.updateGeneratedContentStatus(contentId, newStatus);

      // Save feedback
      const feedbackRecord = await storage.createFeedback(validated);

      // If approved, potentially create a lead (simplified logic for demo)
      if (action === "approve") {
        const content = await storage.getGeneratedContent();
        const approvedContent = content.find(c => c.id === contentId);
        
        if (approvedContent && Math.random() > 0.7) { // 30% chance to generate lead
          console.log(`[API] Creating demo lead for approved content ${contentId}`);
          const lead = await storage.createLead({
            contentId,
            email: `lead${Date.now()}@example.com`,
            name: "Demo Lead",
            source: approvedContent.platform,
            icpScore: Math.floor(Math.random() * 40) + 60, // 60-100
            qualificationStatus: "new",
          });

          // Try to create in HubSpot (will gracefully fail if not connected)
          try {
            const hubspotId = await createHubSpotContact(
              lead.email!,
              lead.name!,
              lead.source!
            );
            await storage.updateLead(lead.id, { hubspotContactId: hubspotId });
            console.log(`[API] Created HubSpot contact ${hubspotId}`);
          } catch (error) {
            console.warn("[API] HubSpot integration not available:", error);
          }
        }
      }

      res.json(feedbackRecord);
    } catch (error: any) {
      console.error("[API] Feedback processing error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Invalid feedback data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to process feedback", details: error.message });
      }
    }
  });

  // Leads
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { qualificationStatus } = req.body;
      
      const updateData: any = { qualificationStatus };
      if (qualificationStatus === "contacted" || qualificationStatus === "booked") {
        updateData.contactedAt = new Date();
      }

      const lead = await storage.updateLead(id, updateData);
      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
