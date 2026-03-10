# ProspectMiner AI

ProspectMiner AI is an intelligent lead scraping and enrichment engine built for B2B sales teams.

## What It Does

1. Accepts a search query like `Digital marketing agencies in Chennai`.
2. Creates a background job using BullMQ.
3. Scrapes top business websites using Puppeteer.
4. Extracts emails and phone numbers from each website.
5. Enriches each lead with inferred industry, employee range, relevance score.
6. Generates an AI lead summary with Gemini API.
7. Stores leads in MongoDB.

## Architecture

- API Service (`src/server.js`): receives scrape requests and serves leads.
- Worker Service (`src/jobs/worker.js`): runs scraping + enrichment jobs.
- Queue (`BullMQ + Redis`): decouples API calls from long-running scraping tasks.
- Database (`MongoDB`): stores normalized leads.
- AI Layer (`Gemini`): turns raw lead attributes into concise sales summaries.

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Start MongoDB + Redis

```bash
docker compose up -d
```

### 3) Configure environment

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` (optional but recommended).

### 4) Start API and Worker (two terminals)

```bash
npm run dev
```

```bash
npm run worker
```

## API Endpoints

### Queue a scrape

`POST /api/scrape`

Body:

```json
{
  "query": "Digital marketing agencies in Chennai"
}
```

### List leads

`GET /api/leads?query=Digital marketing agencies in Chennai`

### Queue stats

`GET /api/stats`

## Important Notes

- Google scraping can be rate-limited or blocked. In production, add rotating proxies, captcha solving, and retry strategy.
- Current scraper extracts from top results pages and websites directly; directory integrations (Clutch, G2, IndiaMART, etc.) can be added as dedicated adapters.
- AI summary has a fallback heuristic if Gemini key is missing or API fails.

## Recommended Next Upgrades

1. Add dedup across domains + social handles.
2. Add company firmographics from Clearbit/Apollo/Crunchbase APIs.
3. Add browser fingerprint + proxy pool for anti-bot resilience.
4. Add dashboard UI (Next.js) for campaign filtering and export.
