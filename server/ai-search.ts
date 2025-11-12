import { getOpenAIClient } from "./api-key-manager";
import type { InsertCrawledContent } from "@shared/schema";

interface SearchResult {
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt?: Date;
  platform: string;
  metadata?: Record<string, any>;
}

/**
 * AI-powered content search using web scraping and public endpoints
 * No API credentials required!
 */
export class AIContentSearcher {
  
  /**
   * Search Reddit using public JSON endpoints (no auth required)
   */
  async searchReddit(query: string, subreddit?: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const url = subreddit 
        ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=${limit}&sort=hot`
        : `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=hot`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpsWatch/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Reddit search failed: ${response.status}`);
      }

      const data = await response.json();
      const posts = data.data?.children || [];

      return posts.map((post: any) => {
        const p = post.data;
        return {
          title: p.title,
          content: p.selftext || p.url,
          url: `https://reddit.com${p.permalink}`,
          author: p.author,
          publishedAt: new Date(p.created_utc * 1000),
          platform: 'reddit',
          metadata: {
            subreddit: p.subreddit,
            score: p.score,
            numComments: p.num_comments,
            upvoteRatio: p.upvote_ratio,
          },
        };
      });
    } catch (error: any) {
      console.error('[AI Search] Reddit search failed:', error);
      return [];
    }
  }

  /**
   * Search YouTube using public RSS feeds and oEmbed (no API key required)
   */
  async searchYouTube(channelName: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Use YouTube RSS feed (no auth required)
      // Format: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
      // Or search via: https://www.youtube.com/results?search_query=...
      
      // For now, use a simple approach with public search
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}`;
      
      // Note: YouTube's HTML is complex. In production, you'd want to:
      // 1. Use a proper scraping library (cheerio, puppeteer)
      // 2. Or use YouTube's RSS feeds if you have channel IDs
      // 3. Or use the oEmbed endpoint for individual videos
      
      console.log('[AI Search] YouTube search via public endpoints:', searchUrl);
      
      // For now, return empty and suggest using the AI-powered alternative below
      return [];
    } catch (error: any) {
      console.error('[AI Search] YouTube search failed:', error);
      return [];
    }
  }

  /**
   * Use AI to search and summarize content from the web
   * This uses OpenAI's web browsing capabilities or generates search queries
   */
  async aiWebSearch(userId: string, topic: string, platforms: string[] = ['reddit', 'youtube']): Promise<SearchResult[]> {
    const openai = await getOpenAIClient(userId);
    
    if (!openai) {
      console.warn('[AI Search] OpenAI not configured, falling back to direct search');
      
      // Fallback to direct searches
      const results: SearchResult[] = [];
      
      if (platforms.includes('reddit')) {
        const redditResults = await this.searchReddit(topic);
        results.push(...redditResults);
      }
      
      return results;
    }

    try {
      // Use AI to generate optimal search queries
      const searchQueryResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a search query expert. Generate optimal search queries for finding relevant content on social media platforms.",
          },
          {
            role: "user",
            content: `Generate 3 search queries to find high-quality content about: "${topic}"\n\nPlatforms: ${platforms.join(', ')}\n\nReturn as JSON array of strings.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const queries = JSON.parse(searchQueryResponse.choices[0].message.content || '{"queries":[]}');
      const searchQueries = queries.queries || [topic];

      // Execute searches with AI-generated queries
      const allResults: SearchResult[] = [];
      
      for (const query of searchQueries.slice(0, 2)) { // Limit to 2 queries
        if (platforms.includes('reddit')) {
          const redditResults = await this.searchReddit(query, undefined, 5);
          allResults.push(...redditResults);
        }
      }

      // Use AI to filter and rank results
      if (allResults.length > 0) {
        const rankedResults = await this.rankResultsWithAI(openai, allResults, topic);
        return rankedResults;
      }

      return allResults;
    } catch (error: any) {
      console.error('[AI Search] AI web search failed:', error);
      // Fallback to basic search
      return await this.searchReddit(topic);
    }
  }

  /**
   * Use AI to rank and filter search results
   */
  private async rankResultsWithAI(openai: any, results: SearchResult[], topic: string): Promise<SearchResult[]> {
    try {
      const resultsText = results.map((r, i) => 
        `${i}. ${r.title} (${r.platform}) - Score: ${r.metadata?.score || 0}`
      ).join('\n');

      const rankingResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You rank content by relevance and quality. Return indices of top results in order.",
          },
          {
            role: "user",
            content: `Topic: "${topic}"\n\nResults:\n${resultsText}\n\nReturn JSON array of top 5 result indices in order of relevance.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const ranking = JSON.parse(rankingResponse.choices[0].message.content || '{"indices":[]}');
      const indices = ranking.indices || results.map((_, i) => i);

      return indices.slice(0, 10).map((i: number) => results[i]).filter(Boolean);
    } catch (error) {
      console.error('[AI Search] Ranking failed:', error);
      return results.slice(0, 10);
    }
  }

  /**
   * Convert search results to crawled content format
   */
  resultsToCrawledContent(results: SearchResult[], topicId?: string): InsertCrawledContent[] {
    return results.map(result => {
      const engagementScore = this.calculateEngagementScore(result);
      
      return {
        topicId: topicId || null,
        platform: result.platform,
        contentType: 'post',
        title: result.title,
        contentText: result.content,
        url: result.url,
        author: result.author || null,
        publishedAt: result.publishedAt || new Date(),
        views: 0,
        likes: result.metadata?.score || 0,
        comments: result.metadata?.numComments || 0,
        shares: 0,
        engagementScore,
        metadata: result.metadata,
        crawlerConfigId: null,
      };
    });
  }

  /**
   * Calculate engagement score from available metrics
   */
  private calculateEngagementScore(result: SearchResult): number {
    const score = result.metadata?.score || 0;
    const comments = result.metadata?.numComments || 0;
    const ratio = result.metadata?.upvoteRatio || 0.5;
    
    // Simple formula: (score * ratio) + (comments * 2)
    return Math.round((score * ratio) + (comments * 2));
  }
}

// Export singleton instance
export const aiSearcher = new AIContentSearcher();
