import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database with demo data...");

  try {
    // Create a demo topic
    const topic = await storage.createTopic({
      name: "SaaS Marketing",
      description: "Content marketing strategies for B2B SaaS companies",
      icpFitScore: 85,
    });
    console.log(`✓ Created topic: ${topic.name}`);

    // Create demo crawler configs
    const crawlers = await Promise.all([
      storage.createCrawlerConfig({
        name: "r/SaaS Discussions",
        platform: "reddit",
        sourceUrl: "https://reddit.com/r/saas",
        isActive: true,
        crawlFrequency: "daily",
        topicId: topic.id,
      }),
      storage.createCrawlerConfig({
        name: "SaaS YouTube Channels",
        platform: "youtube",
        sourceUrl: "https://youtube.com/@saasacademy",
        isActive: true,
        crawlFrequency: "weekly",
        topicId: topic.id,
      }),
      storage.createCrawlerConfig({
        name: "Marketing Twitter Feed",
        platform: "twitter",
        sourceUrl: "https://twitter.com/search?q=saas+marketing",
        isActive: false,
        crawlFrequency: "hourly",
        topicId: topic.id,
      }),
    ]);
    console.log(`✓ Created ${crawlers.length} crawler configs`);

    // Create demo crawled content (high performers) - need at least 10 total for insight generation
    const highPerformers = await Promise.all([
      storage.createCrawledContent({
        crawlerConfigId: crawlers[0].id,
        topicId: topic.id,
        platform: "reddit",
        contentType: "post",
        title: "How we got our first 100 customers with zero marketing budget",
        contentText: "Stop spending money on ads. Focus on building in public. Share your journey on Twitter, write detailed case studies, and engage with your target audience where they hang out. We built our SaaS to $10k MRR without spending a single dollar on paid ads.",
        url: "https://reddit.com/r/saas/example1",
        author: "startup_founder",
        publishedAt: new Date("2024-01-15"),
        views: 12500,
        likes: 450,
        comments: 89,
        shares: 67,
        engagementScore: 95,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[0].id,
        topicId: topic.id,
        platform: "reddit",
        contentType: "post",
        title: "The exact cold email template that got us 30% reply rate",
        contentText: "Forget generic templates. Personalization at scale is the key. We analyze each prospect's recent activity, mention a specific pain point, and offer immediate value. Here's the exact framework we use...",
        url: "https://reddit.com/r/saas/example2",
        author: "growth_hacker",
        publishedAt: new Date("2024-01-20"),
        views: 8900,
        likes: 340,
        comments: 78,
        shares: 45,
        engagementScore: 92,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[1].id,
        topicId: topic.id,
        platform: "youtube",
        contentType: "video",
        title: "Why Your SaaS Onboarding is Killing Conversions",
        contentText: "Most SaaS companies lose 70% of trial users in the first week. The problem? Terrible onboarding. In this video, I'll show you the 3-step framework we used to increase activation by 250%.",
        url: "https://youtube.com/watch?v=example1",
        author: "SaaS Academy",
        publishedAt: new Date("2024-02-01"),
        views: 45000,
        likes: 1200,
        comments: 156,
        shares: 89,
        engagementScore: 88,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[0].id,
        topicId: topic.id,
        platform: "reddit",
        contentType: "post",
        title: "From $0 to $50k MRR: The exact playbook we used",
        contentText: "No fluff, no generic advice. Here are the 7 specific tactics that took us from zero to $50k monthly recurring revenue in 14 months. Each one includes the exact metrics and timelines.",
        url: "https://reddit.com/r/saas/example7",
        author: "saas_growth",
        publishedAt: new Date("2024-02-10"),
        views: 15600,
        likes: 520,
        comments: 94,
        shares: 78,
        engagementScore: 94,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[1].id,
        topicId: topic.id,
        platform: "youtube",
        contentType: "video",
        title: "I analyzed 500 successful SaaS launches. Here's what actually works.",
        contentText: "After studying 500 product launches, I found 3 patterns that predicted 80% of the successful ones. Here's the data-backed framework with specific examples from each launch stage.",
        url: "https://youtube.com/watch?v=example8",
        author: "SaaS Metrics Lab",
        publishedAt: new Date("2024-02-15"),
        views: 38000,
        likes: 980,
        comments: 142,
        shares: 67,
        engagementScore: 90,
      }),
    ]);
    console.log(`✓ Created ${highPerformers.length} high-performing content items`);

    // Create demo crawled content (low performers)
    const lowPerformers = await Promise.all([
      storage.createCrawledContent({
        crawlerConfigId: crawlers[0].id,
        topicId: topic.id,
        platform: "reddit",
        contentType: "post",
        title: "Check out our new SaaS product!",
        contentText: "Hey everyone, we just launched our new SaaS product. It has lots of great features. Check it out and let us know what you think!",
        url: "https://reddit.com/r/saas/example3",
        author: "newproduct",
        publishedAt: new Date("2024-01-10"),
        views: 450,
        likes: 8,
        comments: 3,
        shares: 0,
        engagementScore: 15,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[0].id,
        topicId: topic.id,
        platform: "reddit",
        contentType: "post",
        title: "My SaaS journey",
        contentText: "I've been working on my SaaS for a while now. It's been challenging but rewarding. Just wanted to share my experience.",
        url: "https://reddit.com/r/saas/example4",
        author: "solo_dev",
        publishedAt: new Date("2024-01-18"),
        views: 620,
        likes: 12,
        comments: 5,
        shares: 1,
        engagementScore: 18,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[1].id,
        topicId: topic.id,
        platform: "youtube",
        contentType: "video",
        title: "SaaS Tutorial Part 1",
        contentText: "In this tutorial series, I'll show you how to build a SaaS application. We'll start with the basics and work our way up.",
        url: "https://youtube.com/watch?v=example2",
        author: "Code Tutorial",
        publishedAt: new Date("2024-02-05"),
        views: 890,
        likes: 34,
        comments: 8,
        shares: 2,
        engagementScore: 22,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[0].id,
        topicId: topic.id,
        platform: "reddit",
        contentType: "post",
        title: "What do you think of my product?",
        contentText: "I've been working on this for months. Would love to get some feedback on the idea. Thanks!",
        url: "https://reddit.com/r/saas/example9",
        author: "builder123",
        publishedAt: new Date("2024-02-08"),
        views: 580,
        likes: 9,
        comments: 4,
        shares: 0,
        engagementScore: 16,
      }),
      storage.createCrawledContent({
        crawlerConfigId: crawlers[1].id,
        topicId: topic.id,
        platform: "youtube",
        contentType: "video",
        title: "Intro to our SaaS platform",
        contentText: "Welcome to our platform. In this video we'll show you around and explain what we do. Hope you like it!",
        url: "https://youtube.com/watch?v=example10",
        author: "ProductDemo",
        publishedAt: new Date("2024-02-12"),
        views: 720,
        likes: 28,
        comments: 6,
        shares: 1,
        engagementScore: 19,
      }),
    ]);
    console.log(`✓ Created ${lowPerformers.length} low-performing content items`);

    // Create a demo insight
    const insight = await storage.createInsight({
      topicId: topic.id,
      insightType: "comparative",
      title: "Specificity and immediate value drive 5x more engagement",
      summary: "High-performing content leads with concrete outcomes (e.g., '30% reply rate', '250% increase') and addresses specific pain points. Generic announcements and vague storytelling underperform significantly.",
      highPerformerIds: highPerformers.map(c => c.id),
      lowPerformerIds: lowPerformers.map(c => c.id),
      differentiators: {
        high: [
          "Specific metrics and outcomes in the title",
          "Immediate actionable value proposition",
          "Addresses concrete pain points",
          "Includes detailed frameworks or templates"
        ],
        low: [
          "Generic announcements without context",
          "Vague storytelling without specifics",
          "No clear value proposition",
          "Asks for feedback without offering value"
        ]
      },
      confidence: 87,
    });
    console.log(`✓ Created insight: ${insight.title}`);

    // Create demo generated content
    const generatedContent = await Promise.all([
      storage.createGeneratedContent({
        insightId: insight.id,
        topicId: topic.id,
        platform: "reddit",
        contentType: "text_post",
        title: "How I increased trial-to-paid conversion by 127% with this 3-email sequence",
        content: `Stop sending generic welcome emails. Here's the exact 3-email sequence that converted 127% more trial users:

Email 1 (Day 0): The Quick Win
- Don't explain features
- Give them ONE specific action that delivers immediate value
- Example: "Get your first insight in 60 seconds"

Email 2 (Day 2): The Aha Moment
- Show them the transformation
- Use a specific before/after scenario
- Make it personal to their use case

Email 3 (Day 5): The Social Proof
- Share a customer success story with metrics
- Focus on someone similar to them
- Include a specific outcome they achieved

The result? We went from 8% to 18% trial-to-paid conversion.

What's working for you in onboarding?`,
        clarityScore: 92,
        hookStrength: 88,
        alignmentScore: 95,
        status: "pending",
      }),
      storage.createGeneratedContent({
        insightId: insight.id,
        topicId: topic.id,
        platform: "email",
        contentType: "email_script",
        title: "Cold outreach template for SaaS founders",
        content: `Subject: Quick question about [specific pain point]

Hi [Name],

I noticed you recently [specific recent activity]. I've been working with other [their role] at [similar company type] who faced [specific challenge].

One pattern I've seen: [concrete problem with metrics]. For example, [specific scenario].

I put together a 3-minute framework that helped [similar customer] increase [specific metric] by [specific percentage]. Would it be useful if I sent it over?

Either way, hope the [specific pain point] gets easier.

[Your name]

P.S. No pitch, just the framework. Takes 60 seconds to implement.`,
        clarityScore: 85,
        hookStrength: 90,
        alignmentScore: 88,
        status: "approved",
      }),
      storage.createGeneratedContent({
        insightId: insight.id,
        topicId: topic.id,
        platform: "youtube",
        contentType: "video_outline",
        title: "The 5-Minute Onboarding Framework That 3x'd Our Activation Rate",
        content: `HOOK (0:00-0:15):
"Most SaaS companies lose 70% of trial users in week one. We fixed this with a 5-minute change that tripled our activation rate. Here's exactly what we did."

PROBLEM (0:15-1:30):
- Show the painful stats
- Generic onboarding vs. targeted onboarding
- The cost of bad onboarding (churn, wasted acquisition spend)

FRAMEWORK (1:30-6:00):
1. Identify ONE quick win (0:30)
   - Example: Slack's "send your first message"
   - Why it works: immediate dopamine hit
   
2. Personalize the path (0:45)
   - Ask ONE question about their use case
   - Show them the transformation for THEIR scenario
   
3. Create urgency with social proof (0:30)
   - "Users who complete this in 24 hours are 3x more likely to convert"
   - Show real customer results
   
PROOF (6:00-7:30):
- Our before/after metrics
- Case study from [customer name]
- Specific implementation details

CTA (7:30-8:00):
"Try this in your product today. Link to the full framework in the description. What's your onboarding conversion rate? Drop it in the comments."`,
        clarityScore: 90,
        hookStrength: 95,
        alignmentScore: 92,
        status: "revised",
      }),
    ]);
    console.log(`✓ Created ${generatedContent.length} generated content pieces`);

    // Create demo leads
    const leads = await Promise.all([
      storage.createLead({
        contentId: generatedContent[1].id,
        email: "sarah.johnson@techstartup.com",
        name: "Sarah Johnson",
        source: "email",
        icpScore: 92,
        qualificationStatus: "qualified",
      }),
      storage.createLead({
        contentId: generatedContent[0].id,
        email: "mike.chen@saascompany.io",
        name: "Mike Chen",
        source: "reddit",
        icpScore: 78,
        qualificationStatus: "contacted",
        contactedAt: new Date(),
      }),
      storage.createLead({
        contentId: generatedContent[1].id,
        email: "alex.kumar@growthcorp.com",
        name: "Alex Kumar",
        source: "email",
        icpScore: 85,
        qualificationStatus: "booked",
        contactedAt: new Date(),
      }),
    ]);
    console.log(`✓ Created ${leads.length} demo leads`);

    console.log("\n✅ Database seeded successfully!");
    console.log(`
Summary:
- 1 topic
- ${crawlers.length} crawlers
- ${highPerformers.length + lowPerformers.length} crawled content items
- 1 insight
- ${generatedContent.length} generated content pieces
- ${leads.length} leads
    `);
    
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}

export { seed };
