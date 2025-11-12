import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { generateInsight, generateContent, generateImage, generateVideoPrompt } from "./openai";
import { createHubSpotContact } from "./integrations/hubspot";
import { createCalBooking } from "./integrations/calcom";
import {
  insertCrawlerConfigSchema,
  insertCrawledContentSchema,
  insertInsightSchema,
  insertGeneratedContentSchema,
  insertFeedbackSchema,
  insertLeadSchema,
  type Topic,
  type CrawledContent,
  type GeneratedContent,
  type Insight,
  type Lead,
} from "@shared/schema";
import { verifyPassword, sanitizeUser } from "./auth";

const NON_MUTATING_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ANALYTICS_RANGE_TO_DAYS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};
const DAY_MS = 24 * 60 * 60 * 1000;
const QUALIFICATION_SETTINGS_KEY = "qualification_rules";
const qualificationSchema = z.object({
  approvalThreshold: z.number().min(1).max(100),
});
const defaultQualificationRules = { approvalThreshold: 75 } as const;

export async function registerRoutes(app: Express): Promise<Server> {
  const adminApiKey = process.env.ADMIN_API_KEY;

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) {
      return next();
    }

    const hasSession = Boolean(req.session?.user);
    const providedKey = req.header("x-api-key");
    const hasApiKey = adminApiKey && providedKey === adminApiKey;

    if (hasSession || hasApiKey) {
      return next();
    }

    return res.status(401).json({ error: "Unauthorized" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await storage.getUserByEmail(String(email).toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.user = { id: user.id, email: user.email, role: user.role };
    res.json({ user: sanitizeUser(user) });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const dbUser = await storage.getUserByEmail(req.session.user.email);
    if (!dbUser) {
      req.session.destroy(() => undefined);
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ user: sanitizeUser(dbUser) });
  });

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

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const rangeKey = typeof req.query.range === "string" ? req.query.range : "7d";
      const analytics = await loadAnalytics(rangeKey);
      res.json({
        platformData: analytics.platformData,
        contentTypeData: analytics.contentTypeData,
        performanceTrend: analytics.performanceTrend,
        topicPerformance: analytics.topicPerformance,
      });
    } catch (error: any) {
      console.error("[API] Analytics summary error:", error);
      res.status(500).json({ error: "Failed to load analytics", details: error.message });
    }
  });

  app.get("/api/analytics/export", async (req, res) => {
    try {
      const rangeKey = typeof req.query.range === "string" ? req.query.range : "7d";
      const analytics = await loadAnalytics(rangeKey);
      const csv = buildAnalyticsCsv(analytics);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=analytics-${rangeKey}.csv`);
      res.send(csv);
    } catch (error: any) {
      console.error("[API] Analytics export error:", error);
      res.status(500).json({ error: "Failed to export analytics", details: error.message });
    }
  });

  app.get("/api/settings/qualification", async (_req, res) => {
    const rules = await getQualificationRules();
    res.json(rules);
  });

  app.put("/api/settings/qualification", async (req, res) => {
    try {
      const parsed = qualificationSchema.parse(req.body);
      await storage.upsertSetting({ key: QUALIFICATION_SETTINGS_KEY, value: parsed });
      res.json(parsed);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid settings", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
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

  app.get("/api/crawlers/:id/runs", async (req, res) => {
    try {
      const { id } = req.params;
      const runs = await storage.getCrawlerRunsByConfig(id, Number(req.query.limit) || 25);
      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // AI-powered content search (no API keys required!)
  app.post("/api/content/ai-search", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { query, platforms, topicId, autoSave } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const { aiSearcher } = await import("./ai-search");
      
      // Perform AI search
      const results = await aiSearcher.aiWebSearch(
        userId,
        query,
        platforms || ['reddit']
      );

      // Optionally save results as crawled content
      if (autoSave && results.length > 0) {
        const crawledItems = aiSearcher.resultsToCrawledContent(results, topicId);
        
        for (const item of crawledItems) {
          await storage.createCrawledContentIfNew(item);
        }
        
        return res.json({ 
          success: true, 
          results, 
          saved: crawledItems.length,
          message: `Found ${results.length} results, saved ${crawledItems.length} new items`
        });
      }

      res.json({ success: true, results });
    } catch (error: any) {
      console.error("[AI Search] Search failed:", error);
      res.status(500).json({ error: "Search failed", details: error.message });
    }
  });

  // Quick Reddit search (no auth required)
  app.get("/api/content/search/reddit", async (req, res) => {
    try {
      const { q, subreddit, limit } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const { aiSearcher } = await import("./ai-search");
      const results = await aiSearcher.searchReddit(
        String(q),
        subreddit ? String(subreddit) : undefined,
        limit ? parseInt(String(limit)) : 10
      );

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Generate image
  app.post("/api/media/generate-image", async (req, res) => {
    try {
      const { prompt, insightId, topicId, size, quality } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      console.log(`[API] Generating image with prompt: ${prompt.substring(0, 50)}...`);

      const imageData = await generateImage(prompt, size, quality);

      // Save to database
      const generated = await storage.createGeneratedContent({
        insightId: insightId || null,
        topicId: topicId || null,
        platform: "image",
        contentType: "image",
        title: prompt.substring(0, 100),
        content: imageData.revisedPrompt || prompt,
        mediaUrl: imageData.url,
        mediaType: "image",
        mediaMetadata: { size, quality, originalPrompt: prompt },
        status: "pending",
      });

      console.log(`[API] Created image content ${generated.id}`);
      res.json(generated);
    } catch (error: any) {
      console.error("[API] Image generation error:", error);
      res.status(500).json({ error: "Failed to generate image", details: error.message });
    }
  });

  // Generate video prompt/script
  app.post("/api/media/generate-video", async (req, res) => {
    try {
      const { insightId, platform, duration, style, topicId } = req.body;
      
      if (!insightId || !platform) {
        return res.status(400).json({ 
          error: "Missing required fields", 
          message: "insightId and platform are required"
        });
      }

      const insight = await storage.getInsight(insightId);
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }

      console.log(`[API] Generating video script for ${platform} based on insight ${insightId}`);

      const videoData = await generateVideoPrompt(insight, platform, duration, style);

      // Save to database
      const generated = await storage.createGeneratedContent({
        insightId,
        topicId: topicId || insight.topicId,
        platform,
        contentType: "video",
        title: insight.title,
        content: videoData.script,
        mediaType: "video",
        mediaMetadata: { 
          scenes: videoData.scenes, 
          voiceoverText: videoData.voiceoverText,
          duration: duration || 30,
          style 
        },
        status: "pending",
      });

      console.log(`[API] Created video script ${generated.id}`);
      res.json(generated);
    } catch (error: any) {
      console.error("[API] Video generation error:", error);
      res.status(500).json({ error: "Failed to generate video", details: error.message });
    }
  });

  // Intelligent Content Generator Routes
  
  // Step 1: Business Questionnaire
  app.post("/api/content/intelligent/questionnaire", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { conversationHistory } = req.body;
      const { intelligentGenerator } = await import("./intelligent-content-generator");
      
      const result = await intelligentGenerator.askBusinessQuestions(userId, conversationHistory || []);
      res.json(result);
    } catch (error: any) {
      console.error("[Intelligent Generator] Questionnaire failed:", error);
      res.status(500).json({ error: "Failed to generate question", details: error.message });
    }
  });

  // Step 2: Generate Content with AI
  app.post("/api/content/intelligent/generate", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { type, platform, topic, researchCompetitors } = req.body;
      
      if (!type || !platform) {
        return res.status(400).json({ error: "Type and platform are required" });
      }

      const { intelligentGenerator } = await import("./intelligent-content-generator");
      
      // Get business profile
      const profileSetting = await storage.getSetting(`business_profile_${userId}`);
      const businessProfile = profileSetting?.value;

      if (!businessProfile) {
        return res.status(400).json({ 
          error: "Business profile not found", 
          message: "Please complete the business questionnaire first" 
        });
      }

      // Research competitors if requested
      let competitorInsights;
      if (researchCompetitors) {
        competitorInsights = await intelligentGenerator.researchCompetitors(businessProfile);
      }

      // Generate optimized prompt
      const optimizedPrompt = await intelligentGenerator.generateOptimizedPrompt({
        userId,
        type,
        platform,
        topic,
        businessProfile,
      }, competitorInsights);

      // Generate content based on type
      let generated;
      if (type === "text") {
        generated = await intelligentGenerator.generateTextContent(optimizedPrompt, businessProfile);
      } else if (type === "image") {
        generated = await intelligentGenerator.generateImageWithFeedback(optimizedPrompt);
      } else if (type === "video") {
        generated = await intelligentGenerator.generateVideoWithFeedback(optimizedPrompt);
      }

      // Save to database
      await storage.createGeneratedContent({
        insightId: null,
        topicId: null,
        platform,
        contentType: type,
        title: topic || `Generated ${type}`,
        content: generated.content,
        mediaUrl: generated.mediaUrl || null,
        mediaType: type === "text" ? null : type,
        mediaMetadata: {
          prompt: generated.prompt,
          reasoning: generated.reasoning,
          qualityScore: generated.qualityScore,
        },
        status: "pending",
      });

      res.json({
        success: true,
        generated,
        competitorInsights,
      });
    } catch (error: any) {
      console.error("[Intelligent Generator] Generation failed:", error);
      res.status(500).json({ error: "Failed to generate content", details: error.message });
    }
  });

  // Step 3: Regenerate with Feedback
  app.post("/api/content/intelligent/regenerate", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { contentId, feedback, previousAttempts } = req.body;
      
      if (!contentId || !feedback) {
        return res.status(400).json({ error: "Content ID and feedback are required" });
      }

      const { intelligentGenerator } = await import("./intelligent-content-generator");
      
      // Get original content
      const original = await storage.getGeneratedContent();
      const content = original.find(c => c.id === contentId);
      
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const metadata = content.mediaMetadata as any;
      const originalPrompt = metadata?.prompt || content.content;

      // Regenerate based on type and feedback
      let regenerated;
      if (content.mediaType === "image") {
        regenerated = await intelligentGenerator.generateImageWithFeedback(
          originalPrompt,
          previousAttempts || [],
          feedback
        );
      } else if (content.mediaType === "video") {
        regenerated = await intelligentGenerator.generateVideoWithFeedback(
          originalPrompt,
          previousAttempts || [],
          feedback
        );
      } else {
        // For text, regenerate with feedback
        const improvedPrompt = originalPrompt + `\n\nFeedback from previous attempt: ${feedback}\n\nImprove based on this feedback.`;
        const profileSetting = await storage.getSetting(`business_profile_${userId}`);
        regenerated = await intelligentGenerator.generateTextContent(improvedPrompt, profileSetting?.value);
      }

      // Save new version
      await storage.createGeneratedContent({
        insightId: content.insightId,
        topicId: content.topicId,
        platform: content.platform,
        contentType: content.contentType,
        title: content.title,
        content: regenerated.content,
        mediaUrl: regenerated.mediaUrl || null,
        mediaType: content.mediaType,
        mediaMetadata: {
          prompt: regenerated.prompt,
          reasoning: regenerated.reasoning,
          qualityScore: regenerated.qualityScore,
          previousAttempts: [...(previousAttempts || []), { contentId, feedback }],
        },
        status: "pending",
      });

      res.json({
        success: true,
        regenerated,
      });
    } catch (error: any) {
      console.error("[Intelligent Generator] Regeneration failed:", error);
      res.status(500).json({ error: "Failed to regenerate content", details: error.message });
    }
  });

  // Step 4: Submit Feedback
  app.post("/api/content/intelligent/feedback", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { contentId, liked, comments } = req.body;
      
      if (!contentId || liked === undefined) {
        return res.status(400).json({ error: "Content ID and liked status are required" });
      }

      const { intelligentGenerator } = await import("./intelligent-content-generator");
      
      await intelligentGenerator.processFeedback(contentId, userId, liked, comments || "");

      res.json({ success: true, message: "Feedback processed and learning applied" });
    } catch (error: any) {
      console.error("[Intelligent Generator] Feedback processing failed:", error);
      res.status(500).json({ error: "Failed to process feedback", details: error.message });
    }
  });

  // Get Business Profile
  app.get("/api/content/intelligent/profile", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const profileSetting = await storage.getSetting(`business_profile_${userId}`);
      res.json({ profile: profileSetting?.value || null });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get profile", details: error.message });
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

      if (action === "approve") {
        await maybeCreateLeadFromContent(contentId);
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

  app.post("/api/leads/:id/book", async (req, res) => {
    try {
      const { id } = req.params;
      const notes = req.body?.notes;
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      const booking = await createCalBooking(lead, notes);
      const updated = await storage.updateLead(id, {
        qualificationStatus: "booked",
        bookingUrl: booking.url,
        contactedAt: new Date(),
      });
      res.json({ lead: updated, booking });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get integration status
  app.get("/api/settings/integrations", async (req, res) => {
    const userId = req.session.user?.id;
    
    // Check for user-specific keys if authenticated
    let userKeys: Record<string, boolean> = {};
    if (userId) {
      const keys = await storage.getUserApiKeys(userId);
      keys.forEach(key => {
        if (key.isActive) {
          userKeys[key.service] = true;
        }
      });
    }

    const integrations = [
      {
        id: "hubspot",
        name: "HubSpot CRM",
        description: "Sync leads automatically",
        connected: userKeys["hubspot"] || Boolean(process.env.HUBSPOT_CONNECTOR || process.env.HUBSPOT_ACCESS_TOKEN),
        source: userKeys["hubspot"] ? "user" : "system",
      },
      {
        id: "youtube",
        name: "YouTube Data API",
        description: "Monitor video performance",
        connected: userKeys["youtube"] || Boolean(process.env.YOUTUBE_API_KEY),
        source: userKeys["youtube"] ? "user" : "system",
      },
      {
        id: "openai",
        name: "OpenAI API",
        description: "Powers insight & content generation",
        connected: userKeys["openai"] || Boolean(process.env.OPENAI_API_KEY),
        source: userKeys["openai"] ? "user" : "system",
      },
      {
        id: "reddit",
        name: "Reddit API",
        description: "Crawl Reddit content",
        connected: userKeys["reddit"] || Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
        source: userKeys["reddit"] ? "user" : "system",
      },
      {
        id: "calcom",
        name: "Cal.com",
        description: "Meeting booking automation",
        connected: userKeys["calcom"] || Boolean(process.env.CALCOM_API_KEY),
        source: userKeys["calcom"] ? "user" : "system",
      },
    ];
    res.json(integrations);
  });

  // User API Keys Management
  app.get("/api/user/api-keys", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const keys = await storage.getUserApiKeys(userId);
    // Return masked keys for security
    const { maskApiKey } = await import("./encryption");
    const maskedKeys = keys.map(key => ({
      id: key.id,
      service: key.service,
      keyName: key.keyName,
      maskedKey: maskApiKey(key.encryptedKey.split(":")[3] || "****"),
      isActive: key.isActive,
      createdAt: key.createdAt,
    }));
    res.json(maskedKeys);
  });

  app.post("/api/user/api-keys", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { service, apiKey, keyName } = req.body;
    if (!service || !apiKey) {
      return res.status(400).json({ error: "Service and apiKey are required" });
    }

    const validServices = ["openai", "youtube", "hubspot", "reddit", "calcom"];
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: "Invalid service" });
    }

    try {
      const { encryptApiKey } = await import("./encryption");
      const encryptedKey = encryptApiKey(apiKey);

      // Check if user already has a key for this service
      const existing = await storage.getUserApiKeyByService(userId, service);
      if (existing) {
        // Update existing
        const updated = await storage.updateUserApiKey(existing.id, {
          encryptedKey,
          keyName: keyName || existing.keyName,
        });
        return res.json({ success: true, id: updated.id });
      }

      // Create new
      const newKey = await storage.createUserApiKey({
        userId,
        service,
        encryptedKey,
        keyName,
        isActive: true,
      });

      res.json({ success: true, id: newKey.id });
    } catch (error: any) {
      console.error("Failed to save API key:", error);
      res.status(500).json({ error: "Failed to save API key" });
    }
  });

  app.delete("/api/user/api-keys/:id", async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    try {
      // Verify ownership before deleting
      const keys = await storage.getUserApiKeys(userId);
      const key = keys.find(k => k.id === id);
      if (!key) {
        return res.status(404).json({ error: "API key not found" });
      }

      await storage.deleteUserApiKey(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to delete API key:", error);
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function loadAnalytics(rangeKey: string) {
  const days = ANALYTICS_RANGE_TO_DAYS[rangeKey] || ANALYTICS_RANGE_TO_DAYS["7d"];
  const since = new Date(Date.now() - days * DAY_MS);

  const [crawled, insightsList, generated, leadsList, topics] = await Promise.all([
    storage.getCrawledContentSince(since),
    storage.getInsightsSince(since),
    storage.getGeneratedContentSince(since),
    storage.getLeadsSince(since),
    storage.getTopics(),
  ]);

  const platformData = buildPlatformData(crawled, generated);
  const contentTypeData = buildContentTypeData(generated);
  const performanceTrend = buildPerformanceTrend(days, crawled, insightsList, generated, leadsList);
  const topicPerformance = buildTopicPerformance(topics, insightsList, generated, leadsList);

  return { days, since, platformData, contentTypeData, performanceTrend, topicPerformance };
}

function buildAnalyticsCsv(analytics: Awaited<ReturnType<typeof loadAnalytics>>) {
  const rows: string[] = [];
  rows.push("Section,Metric,Value");
  analytics.platformData.forEach((platform) => {
    rows.push(`Platform Posts,${platform.platform},${platform.posts}`);
    rows.push(`Platform Avg Engagement,${platform.platform},${platform.avgEngagement}`);
    rows.push(`Platform Approval Rate,${platform.platform},${platform.approvalRate}`);
  });
  analytics.contentTypeData.forEach((type) => {
    rows.push(`Content Type Count,${type.type},${type.value}`);
  });
  analytics.performanceTrend.forEach((day) => {
    rows.push(`Trend Crawled,${day.date},${day.crawled}`);
    rows.push(`Trend Insights,${day.date},${day.insights}`);
    rows.push(`Trend Approved,${day.date},${day.approved}`);
    rows.push(`Trend Leads,${day.date},${day.leads}`);
  });
  analytics.topicPerformance.forEach((topic) => {
    rows.push(`Topic Insights,${topic.topic},${topic.insights}`);
    rows.push(`Topic Content,${topic.topic},${topic.content}`);
    rows.push(`Topic Conversion,${topic.topic},${topic.conversionRate}`);
  });
  return rows.join("\n");
}

function buildPlatformData(crawled: CrawledContent[], generated: GeneratedContent[]) {
  const map = new Map<string, { platform: string; posts: number; totalEngagement: number; generated: number; approved: number }>();

  const ensureEntry = (platform: string) => {
    if (!map.has(platform)) {
      map.set(platform, { platform, posts: 0, totalEngagement: 0, generated: 0, approved: 0 });
    }
    return map.get(platform)!;
  };

  crawled.forEach((item) => {
    const entry = ensureEntry(item.platform);
    entry.posts += 1;
    entry.totalEngagement += item.engagementScore || 0;
  });

  generated.forEach((item) => {
    const entry = ensureEntry(item.platform);
    entry.generated += 1;
    if (item.status === "approved") {
      entry.approved += 1;
    }
  });

  return Array.from(map.values()).map((entry) => ({
    platform: titleCase(entry.platform),
    posts: entry.posts,
    avgEngagement: entry.posts ? Math.round(entry.totalEngagement / entry.posts) : 0,
    approvalRate: entry.generated ? Math.round((entry.approved / entry.generated) * 100) : 0,
  }));
}

function buildContentTypeData(generated: GeneratedContent[]) {
  const map = new Map<string, number>();
  generated.forEach((item) => {
    const key = item.contentType || "unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([type, value]) => ({
    type: titleCase(type.replace(/[_-]/g, " ")), value,
  }));
}

function buildPerformanceTrend(
  days: number,
  crawled: CrawledContent[],
  insights: Insight[],
  generated: GeneratedContent[],
  leads: Lead[],
) {
  const buckets: Array<{ key: string; date: string; crawled: number; insights: number; approved: number; leads: number }> = [];
  const bucketMap = new Map<string, (typeof buckets)[number]>();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = isoDay(date);
    const bucket = { key, date: formatDayLabel(date), crawled: 0, insights: 0, approved: 0, leads: 0 };
    buckets.push(bucket);
    bucketMap.set(key, bucket);
  }

  const assignCount = <T extends { createdAt?: Date | null }>(items: T[], field: "crawled" | "insights" | "approved" | "leads", predicate?: (item: T) => boolean) => {
    items.forEach((item) => {
      if (predicate && !predicate(item)) {
        return;
      }
      const createdAt = item.createdAt ? new Date(item.createdAt) : undefined;
      if (!createdAt) return;
      const bucket = bucketMap.get(isoDay(createdAt));
      if (bucket) {
        bucket[field] += 1;
      }
    });
  };

  assignCount(crawled, "crawled");
  assignCount(insights, "insights");
  assignCount(generated, "approved", (item) => item.status === "approved");
  assignCount(leads, "leads");

  return buckets;
}

function buildTopicPerformance(
  topics: Topic[],
  insights: Insight[],
  generated: GeneratedContent[],
  leads: Lead[],
) {
  const contentById = new Map(generated.map((item) => [item.id, item]));
  return topics
    .map((topic) => {
      const topicInsights = insights.filter((insight) => insight.topicId === topic.id);
      const topicContent = generated.filter((content) => content.topicId === topic.id);
      const topicLeads = leads.filter((lead) => {
        if (!lead.contentId) return false;
        const content = contentById.get(lead.contentId);
        return content?.topicId === topic.id;
      });

      const conversionRate = topicContent.length
        ? Number(((topicLeads.length / topicContent.length) * 100).toFixed(1))
        : 0;

      return {
        topic: topic.name,
        insights: topicInsights.length,
        content: topicContent.length,
        conversionRate,
      };
    })
    .filter((entry) => entry.insights || entry.content || entry.conversionRate)
    .slice(0, 8);
}

async function getQualificationRules() {
  const setting = await storage.getSetting(QUALIFICATION_SETTINGS_KEY);
  return { ...defaultQualificationRules, ...(setting?.value ?? {}) };
}

async function maybeCreateLeadFromContent(contentId: string) {
  const approvedContent = await storage.getGeneratedContentById(contentId);
  if (!approvedContent) {
    return;
  }

  const rules = await getQualificationRules();
  const score = computeLeadScore(approvedContent);
  if (score < rules.approvalThreshold) {
    return;
  }

  const leadName = deriveLeadName(approvedContent);
  const leadEmail = deriveLeadEmail(approvedContent);
  const lead = await storage.createLead({
    contentId,
    email: leadEmail,
    name: leadName,
    source: approvedContent.platform,
    icpScore: score,
    qualificationStatus: score >= 80 ? "qualified" : "new",
  });

  try {
    const hubspotId = await createHubSpotContact(lead.email!, lead.name!, lead.source || "content");
    await storage.updateLead(lead.id, { hubspotContactId: hubspotId });
  } catch (error) {
    console.warn("[API] HubSpot integration not available:", error);
  }
}

function computeLeadScore(content: GeneratedContent) {
  const scores = [content.clarityScore, content.hookStrength, content.alignmentScore].filter(
    (value): value is number => typeof value === "number" && !Number.isNaN(value),
  );
  if (!scores.length) {
    return 50;
  }
  return Math.max(0, Math.min(100, Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)));
}

function deriveLeadName(content: GeneratedContent) {
  if (content.title) {
    const base = content.title.split("|")[0].trim();
    return base || "Qualified Prospect";
  }
  return "Qualified Prospect";
}

function deriveLeadEmail(content: GeneratedContent) {
  const slug = slugify(content.title || `content-${content.id || Date.now()}`);
  return `${slug}@engaged-leads.local`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "lead";
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function titleCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
