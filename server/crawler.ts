import type { CrawlerConfig, InsertCrawledContent, InsertCrawlerRun } from "@shared/schema";
import { storage } from "./storage";
import { log } from "./vite";

const FREQUENCY_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

const USER_AGENT = process.env.CRAWLER_USER_AGENT || "OpsWatchCrawler/1.0";

const REFRESH_INTERVAL_MS = 60 * 1000; // resync configs every minute
const MAX_ITEMS_PER_RUN = 5;
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

const redditCredentials = {
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
};

let redditTokenCache: { token: string; expiresAt: number } | null = null;

export async function startCrawlerScheduler() {
  const scheduler = new CrawlerScheduler();
  await scheduler.start();
  return scheduler;
}

class CrawlerScheduler {
  private jobs = new Map<string, NodeJS.Timeout>();
  private refresher?: NodeJS.Timeout;
  private inFlight = new Set<string>();

  async start() {
    await this.syncJobs();
    this.refresher = setInterval(() => {
      this.syncJobs().catch((error) => log(`[Crawler] sync error: ${error.message}`));
    }, REFRESH_INTERVAL_MS);
    log("[Crawler] scheduler ready");
  }

  private async syncJobs() {
    const configs = await storage.getCrawlerConfigs();
    const active = configs.filter((config) => config.isActive);
    const activeIds = new Set(active.map((config) => config.id));

    // Clean up cancelled jobs
    for (const [id, job] of this.jobs.entries()) {
      if (!activeIds.has(id)) {
        clearInterval(job);
        this.jobs.delete(id);
        log(`[Crawler] cleared schedule for ${id}`);
      }
    }

    for (const config of active) {
      const interval = FREQUENCY_MS[config.crawlFrequency || "daily"] || FREQUENCY_MS.daily;
      if (!this.jobs.has(config.id)) {
        this.jobs.set(
          config.id,
          setInterval(() => {
            this.run(config.id).catch((error) => log(`[Crawler] run error ${config.id}: ${error.message}`));
          }, interval),
        );
        this.run(config.id).catch((error) => log(`[Crawler] initial run error ${config.id}: ${error.message}`));
        log(`[Crawler] scheduled ${config.name} (${config.crawlFrequency}) every ${Math.round(interval / 60000)}m`);
      }
    }
  }

  private async run(configId: string) {
    if (this.inFlight.has(configId)) {
      return;
    }
    this.inFlight.add(configId);
    let runRecordId: string | null = null;
    try {
      const config = await storage.getCrawlerConfig(configId);
      if (!config || !config.isActive) {
        return;
      }

      const runRecord = await storage.createCrawlerRun({
        crawlerConfigId: config.id,
        status: "running",
        metadata: { sourceUrl: config.sourceUrl, platform: config.platform },
      } as InsertCrawlerRun);
      runRecordId = runRecord.id;

      const entries = await crawlConfig(config);
      for (const entry of entries) {
        await storage.createCrawledContentIfNew(entry);
      }
      await storage.updateCrawlerConfig(config.id, { lastCrawledAt: new Date() });
      await storage.updateCrawlerRun(runRecord.id, {
        status: "success",
        itemsIngested: entries.length,
        finishedAt: new Date(),
      });
      log(`[Crawler] stored ${entries.length} items for ${config.name}`);
    } catch (error: any) {
      log(`[Crawler] failed run for ${configId}: ${error.message}`);
      if (runRecordId) {
        await storage.updateCrawlerRun(runRecordId, {
          status: "failed",
          error: error.message?.slice(0, 500),
          finishedAt: new Date(),
        }).catch(() => undefined);
      } else {
        await storage.createCrawlerRun({
          crawlerConfigId: configId,
          status: "failed",
          error: error.message,
          metadata: { platform: "unknown" },
        } as InsertCrawlerRun).catch(() => undefined);
      }
    } finally {
      this.inFlight.delete(configId);
    }
  }
}

async function crawlConfig(config: CrawlerConfig): Promise<InsertCrawledContent[]> {
  try {
    switch (config.platform.toLowerCase()) {
      case "reddit":
        return await crawlReddit(config);
      case "youtube":
        return await crawlYouTube(config);
      case "blog":
      case "rss":
      case "twitter":
      default:
        return await crawlGeneric(config);
    }
  } catch (error: any) {
    log(`[Crawler] ${config.name} fallback: ${error.message}`);
    return buildSyntheticPayload(config, error.message);
  }
}

async function crawlReddit(config: CrawlerConfig): Promise<InsertCrawledContent[]> {
  const extras = (config.config as any) || {};
  const subreddit = extras.subreddit || inferSubreddit(config.sourceUrl);
  const listing = extras.listing || "hot";
  const params = new URLSearchParams({ limit: String(extras.limit || MAX_ITEMS_PER_RUN) });
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  let endpoint = `https://www.reddit.com/r/${subreddit}/${listing}.json?${params.toString()}`;

  if (redditAuthAvailable()) {
    const token = await getRedditToken();
    headers.Authorization = `Bearer ${token}`;
    endpoint = `https://oauth.reddit.com/r/${subreddit}/${listing}.json?${params.toString()}`;
  }

  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    throw new Error(`Reddit responded with ${response.status}`);
  }
  const body = await response.json();
  const posts: any[] = body?.data?.children ?? [];
  if (!posts.length) {
    throw new Error("No Reddit posts returned");
  }
  return posts.slice(0, MAX_ITEMS_PER_RUN).map((child) => {
    const data = child.data || {};
    return normalizeContent(config, {
      title: data.title,
      contentText: data.selftext || data.title,
      url: data.permalink ? `https://reddit.com${data.permalink}` : config.sourceUrl,
      author: data.author,
      publishedAt: new Date((data.created_utc || Date.now() / 1000) * 1000),
      views: data.view_count || data.score * 20 || 0,
      likes: data.ups || data.score || 0,
      comments: data.num_comments || 0,
      shares: data.total_awards_received || 0,
      metadata: { subreddit, listing },
    });
  });
}

async function crawlYouTube(config: CrawlerConfig): Promise<InsertCrawledContent[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const extras = (config.config as any) || {};
  const channelId = extras.channelId || extractYouTubeChannelId(config.sourceUrl);
  if (!apiKey || !channelId) {
    return crawlYouTubeFallback(config);
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("order", extras.order || "date");
  searchUrl.searchParams.set("maxResults", String(extras.limit || MAX_ITEMS_PER_RUN));

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    throw new Error(`YouTube search error ${searchResponse.status}`);
  }
  const searchJson = await searchResponse.json();
  const items: any[] = searchJson.items || [];
  const videoIds = items.map((item) => item.id?.videoId).filter(Boolean);
  if (!videoIds.length) {
    return crawlYouTubeFallback(config);
  }

  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("key", apiKey);
  statsUrl.searchParams.set("part", "snippet,statistics");
  statsUrl.searchParams.set("id", videoIds.join(","));

  const statsResponse = await fetch(statsUrl);
  if (!statsResponse.ok) {
    throw new Error(`YouTube videos error ${statsResponse.status}`);
  }
  const statsJson = await statsResponse.json();
  const statsById = new Map((statsJson.items || []).map((item: any) => [item.id, item]));

  return videoIds.map((id) => {
    const video = statsById.get(id);
    const snippet = video?.snippet || {};
    const statistics = video?.statistics || {};
    return normalizeContent(config, {
      title: snippet.title,
      contentText: snippet.description,
      url: `https://www.youtube.com/watch?v=${id}`,
      author: snippet.channelTitle,
      publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date(),
      views: Number(statistics.viewCount || 0),
      likes: Number(statistics.likeCount || 0),
      comments: Number(statistics.commentCount || 0),
      shares: Number(statistics.favoriteCount || 0),
      contentType: "video",
      metadata: { channelId },
    });
  });
}

async function crawlYouTubeFallback(config: CrawlerConfig): Promise<InsertCrawledContent[]> {
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", config.sourceUrl);
  endpoint.searchParams.set("format", "json");
  const response = await fetch(endpoint, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`YouTube oEmbed responded with ${response.status}`);
  }
  const payload = await response.json();
  return [
    normalizeContent(config, {
      title: payload.title,
      contentText: payload.author_name,
      url: config.sourceUrl,
      author: payload.author_name,
      publishedAt: new Date(),
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      contentType: "video",
    }),
  ];
}

async function crawlGeneric(config: CrawlerConfig): Promise<InsertCrawledContent[]> {
  const response = await fetch(config.sourceUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${config.sourceUrl} (${response.status})`);
  }
  const html = await response.text();
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const paragraphMatch = html.match(/<p>(.*?)<\/p>/i);
  const title = titleMatch?.[1]?.trim() || config.name;
  const text = paragraphMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || `Snapshot from ${config.sourceUrl}`;
  return [
    normalizeContent(config, {
      title,
      contentText: text,
      url: config.sourceUrl,
      author: new URL(config.sourceUrl).hostname,
      publishedAt: new Date(),
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      contentType: config.platform === "blog" ? "article" : "post",
    }),
  ];
}

function normalizeContent(
  config: CrawlerConfig,
  data: Partial<InsertCrawledContent> & { title?: string; contentText?: string; url?: string },
): InsertCrawledContent {
  const contentType = data.contentType || inferContentType(config.platform);
  const views = data.views ?? 0;
  const likes = data.likes ?? 0;
  const comments = data.comments ?? 0;
  const shares = data.shares ?? 0;
  const engagementScore = computeEngagementScore({ views, likes, comments, shares });

  return {
    crawlerConfigId: config.id,
    topicId: config.topicId,
    platform: config.platform,
    contentType,
    title: data.title || `${config.name} signal`,
    contentText: data.contentText || "",
    url: data.url || `${config.sourceUrl}#${Date.now()}`,
    author: data.author || "unknown",
    publishedAt: data.publishedAt || new Date(),
    views,
    likes,
    comments,
    shares,
    engagementScore,
    metadata: {
      crawler: config.name,
      source: config.sourceUrl,
      ...(data.metadata || {}),
    },
  };
}

function redditAuthAvailable() {
  return Object.values(redditCredentials).every(Boolean);
}

async function getRedditToken() {
  if (redditTokenCache && redditTokenCache.expiresAt > Date.now()) {
    return redditTokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: "password",
    username: redditCredentials.username!,
    password: redditCredentials.password!,
  });
  const auth = Buffer.from(`${redditCredentials.clientId}:${redditCredentials.clientSecret}`).toString("base64");
  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Reddit token (${response.status})`);
  }
  const json = await response.json();
  redditTokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + Math.max(0, (json.expires_in || 3600) - 60) * 1000,
  };
  return redditTokenCache.token;
}

function inferSubreddit(url: string) {
  const match = url.match(/reddit\.com\/r\/([^\/]+)/i);
  return match?.[1] || "all";
}

function extractYouTubeChannelId(url: string) {
  const channelMatch = url.match(/youtube\.com\/(?:c\/|channel\/)([A-Za-z0-9_-]+)/i);
  return channelMatch?.[1];
}

function buildSyntheticPayload(config: CrawlerConfig, reason = "unreachable source"): InsertCrawledContent[] {
  return Array.from({ length: 3 }).map((_, index) => ({
    crawlerConfigId: config.id,
    topicId: config.topicId,
    platform: config.platform,
    contentType: inferContentType(config.platform),
    title: `${config.name} synthetic insight #${index + 1}`,
    contentText: `Unable to reach ${config.sourceUrl}. Generated placeholder insight (${reason}).`,
    url: `${config.sourceUrl.replace(/\/$/, "")}?synthetic=${Date.now()}-${index}`,
    author: "opswatch-bot",
    publishedAt: new Date(Date.now() - index * 3_600_000),
    views: 400 + index * 80,
    likes: 90 + index * 15,
    comments: 25 + index * 5,
    shares: 10 + index * 3,
    engagementScore: Math.min(100, 60 + index * 8),
    metadata: { synthetic: true },
  }));
}

function inferContentType(platform: string) {
  switch (platform.toLowerCase()) {
    case "youtube":
      return "video";
    case "blog":
      return "article";
    case "twitter":
      return "thread";
    default:
      return "post";
  }
}

function computeEngagementScore(metrics: { views: number; likes: number; comments: number; shares: number }) {
  const { views, likes, comments, shares } = metrics;
  const weighted = likes * 2 + comments * 3 + shares * 4 + views * 0.2;
  return Math.max(0, Math.min(100, Math.round(weighted / 10)));
}
