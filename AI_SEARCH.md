# AI-Powered Content Search (No API Credentials Required!)

## Overview

Instead of requiring users to provide Reddit API keys, YouTube API keys, or other credentials, we now use **AI-powered web scraping** and **public endpoints** to search and collect content.

## Why This is Better

### ❌ Old Way (API Credentials Required)
- Users need Reddit OAuth credentials
- YouTube Data API key required (with quotas)
- Complex authentication flows
- API rate limits
- Costs money for API access

### ✅ New Way (AI-Powered Search)
- **No credentials needed** - uses public endpoints
- **No API quotas** - direct web scraping
- **Smarter results** - AI ranks by relevance
- **Free** - no API costs
- **Easier** - just enter a search query

## How It Works

### 1. Reddit Search (No Auth)
Uses Reddit's public JSON endpoints:
```
https://www.reddit.com/search.json?q=your+query
https://www.reddit.com/r/subreddit/search.json?q=query
```

These are publicly accessible - no API key needed!

### 2. AI Enhancement (Optional)
If user has configured OpenAI key:
- AI generates **optimal search queries**
- AI **ranks and filters** results by relevance
- AI **deduplicates** and scores content

If no OpenAI key:
- Falls back to direct Reddit search
- Still works perfectly!

### 3. Automatic Content Ingestion
Results are automatically converted to crawled content format and saved to the database.

## Features

### 🔍 AI Search Dialog
**Location:** Crawlers page → "AI Search" button

**Inputs:**
- Search query (e.g., "SaaS marketing strategies")
- Platforms to search (Reddit, YouTube)
- Auto-save toggle (save results automatically)

**Output:**
- Live results preview
- Automatic content ingestion
- Success notification

### 🌐 Public Endpoints Used

#### Reddit
- Search: `/search.json?q=query`
- Subreddit: `/r/subreddit/search.json?q=query`
- Hot posts: `/r/subreddit/hot.json`
- No authentication required!

#### YouTube
- RSS feeds (channel videos)
- oEmbed API (video metadata)
- Public search (HTML scraping)

### 🤖 AI Features

**Search Query Generation:**
```typescript
// AI generates multiple optimized queries
Input: "marketing automation tools"
Output: [
  "best marketing automation software 2024",
  "marketing automation tools comparison",
  "affordable marketing automation platforms"
]
```

**Result Ranking:**
```typescript
// AI scores and ranks by relevance
- Filters spam/low-quality
- Ranks by topic relevance
- Prioritizes high engagement
```

## API Endpoints

### POST `/api/content/ai-search`
Perform AI-powered search across platforms.

**Request:**
```json
{
  "query": "SaaS content marketing",
  "platforms": ["reddit", "youtube"],
  "topicId": "optional-topic-id",
  "autoSave": true
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "title": "Best SaaS marketing strategies",
      "content": "...",
      "url": "https://reddit.com/r/saas/...",
      "author": "username",
      "platform": "reddit",
      "metadata": {
        "score": 342,
        "numComments": 45,
        "subreddit": "saas"
      }
    }
  ],
  "saved": 5,
  "message": "Found 10 results, saved 5 new items"
}
```

### GET `/api/content/search/reddit`
Quick Reddit search without AI.

**Query Parameters:**
- `q` - Search query (required)
- `subreddit` - Specific subreddit (optional)
- `limit` - Number of results (default: 10)

**Example:**
```
GET /api/content/search/reddit?q=marketing&subreddit=saas&limit=20
```

## Usage

### For Users

1. **Go to Crawlers Page**
2. **Click "AI Search" button**
3. **Enter your search query**
4. **Select platforms** (Reddit, YouTube)
5. **Toggle "Auto-save"** if you want results saved
6. **Click "Search"**
7. **Results appear instantly** ✨

No API keys, no authentication, no setup!

### For Developers

```typescript
import { aiSearcher } from "./ai-search";

// Search Reddit
const results = await aiSearcher.searchReddit(
  "marketing automation",
  "saas", // subreddit (optional)
  10      // limit
);

// AI-powered search (with user's OpenAI key)
const smartResults = await aiSearcher.aiWebSearch(
  userId,
  "marketing automation",
  ["reddit", "youtube"]
);

// Convert to crawled content
const crawledItems = aiSearcher.resultsToCrawledContent(
  results,
  topicId
);

// Save to database
for (const item of crawledItems) {
  await storage.createCrawledContentIfNew(item);
}
```

## Backend Services

### `server/ai-search.ts`

**Class:** `AIContentSearcher`

**Methods:**
- `searchReddit(query, subreddit?, limit?)` - Search Reddit (no auth)
- `searchYouTube(channelName, limit?)` - Search YouTube (public)
- `aiWebSearch(userId, topic, platforms)` - AI-powered search
- `rankResultsWithAI(openai, results, topic)` - AI ranking
- `resultsToCrawledContent(results, topicId?)` - Convert format
- `calculateEngagementScore(result)` - Score calculator

## Engagement Scoring

```typescript
score = (reddit_score * upvote_ratio) + (comments * 2)
```

Example:
- Post with 500 upvotes, 0.9 ratio, 30 comments
- Score = (500 * 0.9) + (30 * 2) = 450 + 60 = 510

## Benefits

### 🎯 For Users
- ✅ No API credentials needed
- ✅ Instant search results
- ✅ Works immediately
- ✅ No quota limits
- ✅ Free to use

### 💻 For Platform
- ✅ No API costs
- ✅ No authentication complexity
- ✅ Unlimited scaling
- ✅ Better UX
- ✅ More reliable

### 🔒 For Security
- ✅ No credentials to manage
- ✅ No tokens to expire
- ✅ No OAuth flows
- ✅ Public data only
- ✅ Rate limiting at network level

## Comparison

| Feature | API Credentials | AI Search |
|---------|----------------|-----------|
| **Setup** | Complex OAuth | None |
| **Cost** | API fees | Free |
| **Quotas** | Limited | Unlimited |
| **Speed** | Fast | Fast |
| **Quality** | Raw data | AI-ranked |
| **Maintenance** | Token refresh | None |
| **User Friction** | High | Zero |

## Future Enhancements

- [ ] Twitter/X search (via nitter or public endpoints)
- [ ] LinkedIn public posts
- [ ] Medium articles (RSS)
- [ ] GitHub trending repos
- [ ] Product Hunt launches
- [ ] Hacker News stories
- [ ] Dev.to articles
- [ ] Stack Overflow questions

## Technical Details

### Reddit Public Endpoints

**Search:**
```
https://www.reddit.com/search.json?q={query}&limit=25&sort=hot
```

**Subreddit Posts:**
```
https://www.reddit.com/r/{subreddit}/hot.json?limit=25
```

**User Posts:**
```
https://www.reddit.com/user/{username}/submitted.json?limit=25
```

All return JSON - no authentication required!

### YouTube Public Endpoints

**Channel RSS:**
```
https://www.youtube.com/feeds/videos.xml?channel_id={id}
```

**oEmbed:**
```
https://www.youtube.com/oembed?url={video_url}&format=json
```

**Search:**
- HTML scraping of search results page
- Or use Invidious public instances

## Error Handling

- **Network failures** → Retry with exponential backoff
- **Empty results** → Return empty array
- **AI unavailable** → Fall back to direct search
- **Invalid query** → Return helpful error message
- **Rate limiting** → Respect 429 responses

## Best Practices

1. **Cache Results** - Don't search same query repeatedly
2. **Respect Rate Limits** - Add delays between requests
3. **User Agent** - Set appropriate user agent string
4. **Error Messages** - Show helpful feedback to users
5. **Fallbacks** - Always have non-AI fallback option

## Migration Path

Old crawler configs still work! New AI search is an **addition**, not a replacement:
- **Keep** existing crawler configs
- **Add** AI search as instant search option
- **Users choose** which method to use
- **Both** feed same content database

## Summary

🎉 **AI-powered search eliminates the need for API credentials while providing smarter, more relevant results!**

Users can now search Reddit, YouTube, and other platforms instantly without any setup. The AI enhancement (when available) makes results even better by ranking and filtering based on relevance.

This dramatically improves the user experience and removes a major barrier to adoption. 🚀
