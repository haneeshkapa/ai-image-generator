# OpsWatch Model

Autonomous research → insight → content → feedback → booking loop built with Express, Vite/React, Drizzle ORM, and Neon. The project orchestrates crawlers, comparative insights, AI-assisted content drafts, reviewer feedback, CRM-qualified leads, and analytics in a single stack.

## Features
- **Crawler scheduler** – spins up jobs from crawler configs, scrapes source URLs (Reddit OAuth, YouTube Data API, generic HTML), normalizes engagement metrics, logs every run, and continuously fills the `/api/content/crawled` dataset.
- **Insight & generation APIs** – compare high/low performers via OpenAI, generate platform-native copy, and collect preference feedback for iterative improvement.
- **Media Studio** – AI-powered image generation (DALL-E 3) and video script creation optimized for social platforms. See [MEDIA_STUDIO.md](./MEDIA_STUDIO.md) for details.
- **Leads & CRM handoff** – deterministic lead creation for high-performing approved content, HubSpot connector support, Cal.com meeting booking, and qualification rule management.
- **Operational analytics** – API-driven dashboards for platform performance, content mix, pipeline trends, topic conversions, and CSV exports.
- **Session auth & RBAC-ready shell** – email/password login seeded from env vars, session cookies, and API-key overrides for automation.
- **UI shell** – React + Shadcn for crawlers, review queues, insights, analytics, and lead management.

## Tech Stack
- **Frontend**: Vite, React 18, wouter, React Query, Tailwind/Shadcn, Recharts.
- **Backend**: Express 4, Drizzle ORM, Neon/Postgres, OpenAI SDK, HubSpot SDK.
- **Tooling**: TypeScript everywhere, tsx for dev, Vite + esbuild production bundles.

## Prerequisites
- Node.js 18+
- PostgreSQL (Neon serverless recommended) with `pgcrypto` extension for UUIDs
- Optional: OpenAI API key (GPT‑5) and HubSpot OAuth connector for CRM sync

## Quick Start
1. **Install deps**
   ```bash
   npm install
   ```
2. **Create `.env`** – copy the template and fill in secrets.
   ```bash
   cp .env.example .env
   ```
3. **Provision the database**
   ```bash
   npm run db:push     # applies Drizzle schema
   npx tsx server/seed.ts   # optional demo data
   ```
4. **Run locally**
   ```bash
   npm run dev         # launches Express API + Vite client with tsx
   ```
5. **Production build**
   ```bash
   npm run build       # builds client + bundles server
   npm start           # serves dist/ via Express
   ```

## Environment Variables
| Name | Description |
| ---- | ----------- |
| `DATABASE_URL` | Postgres connection string (required) |
| `SESSION_SECRET` / `AUTH_SALT` | Cookie + password hashing secrets |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded login credentials (change in production) |
| `OPENAI_API_KEY` | Used for insight + content generation (optional – falls back to deterministic templates) |
| `ADMIN_API_KEY` | Static API key required for programmatic mutating calls (`X-API-Key` header) |
| `REDDIT_CLIENT_*` & `YOUTUBE_API_KEY` | Enable authenticated crawlers for those platforms |
| `CALCOM_API_KEY` / `CALCOM_EVENT_TYPE` | Enable meeting booking automation |
| `HUBSPOT_CONNECTOR` vars | Only needed inside Replit to resolve HubSpot tokens (`REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY` / `WEB_REPL_RENEWAL`) |

See `.env.example` for a ready-to-edit template.

## Background Crawlers
`server/crawler.ts` hosts the scheduler. On boot, the server:
1. Loads active crawler configs from the database.
2. Runs each crawler immediately, then on its configured cadence (`hourly`, `daily`, `weekly`).
3. Fetches platform-specific feeds (Reddit OAuth, YouTube Data API, generic HTML, RSS), normalizes engagement, deduplicates by URL, and stores rows in `crawled_content` while logging success/failure to `crawler_runs`.

Crawler logs surface in the server console. Failures fall back to synthetic-but-deterministic snapshots so the downstream pipeline keeps flowing even when a source is unreachable.

To add a new source:
1. Create a crawler config via the UI (or POST `/api/crawlers` with your API key).
2. Point it at a publicly reachable URL (RSS, subreddit, JSON feed, etc.).
3. The scheduler will pick it up within 60 seconds and start ingesting.

## API Auth & Validation
The UI authenticates via session cookies (`/api/auth/login`) and exposes `/api/auth/me` for guards. Programmatic clients can still pass `X-API-Key: <ADMIN_API_KEY>` to bypass the session check. All payloads are validated with Zod schemas shared between client and server.

Payloads are validated with Zod schemas shared between client and server. Any malformed body returns `400` with details.

## Analytics Endpoint
`GET /api/analytics/summary?range=7d` drives the analytics UI. It aggregates:
- Platform stats (posts, average engagement, approval rate)
- Generated content mix by type
-  Daily pipeline trend (crawled, insights, approvals, leads)
- Topic performance (insights, content, conversion rate)
`GET /api/analytics/export?range=7d` returns the same aggregates as CSV for further analysis. Supported ranges: `24h`, `7d`, `30d`, `90d`.

## Development Notes
- The repo is TypeScript-first; `npm run check` (tsc) keeps types green.
- Tailwind tokens live in `tailwind.config.ts`, and Shadcn components follow the `client/src/components/ui` pattern.
- Long-running jobs (crawlers, preference re-trains) should live under `server/` with their own modules and be registered from `server/index.ts`.

## Roadmap
- Add authenticated user accounts / RBAC on the UI
- Persist crawler run history + error logs
- Swap synthetic fallback scraping for production-grade adapters (Reddit OAuth, YouTube Data API, etc.)
- Integrate calendaring + booking webhooks once CRM actions go live
