# JobScout AI — Full Stack Architecture

## Stack Overview

```
Frontend  →  React + Vite  (Netlify / Vercel)
Backend   →  Node.js + Express  (Railway / Render)
Cache     →  Redis  (Upstash free tier)
Storage   →  localStorage (saved searches, theme)
Scraping  →  Puppeteer (LinkedIn) + Indeed API + Naukri scrape
Resume    →  pdf-parse (Node) + Claude AI extraction
```

## Project Structure

```
jobscout/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── SearchPanel.jsx
│   │   │   ├── ResumeUpload.jsx
│   │   │   ├── CompanyChips.jsx
│   │   │   ├── JobGrid.jsx
│   │   │   ├── JobCard.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── SavedSearches.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── hooks/
│   │   │   ├── useJobSearch.js
│   │   │   ├── useSavedSearches.js
│   │   │   └── useTheme.js
│   │   ├── utils/
│   │   │   ├── scrubInput.js
│   │   │   ├── buildLink.js
│   │   │   └── resumeParser.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── routes/
│   │   ├── search.js       ← POST /api/search
│   │   ├── resume.js       ← POST /api/resume/parse
│   │   └── health.js       ← GET  /api/health
│   ├── scrapers/
│   │   ├── linkedin.js     ← Puppeteer headless
│   │   ├── indeed.js       ← Indeed Publisher API
│   │   └── naukri.js       ← Naukri scrape (Axios + Cheerio)
│   ├── middleware/
│   │   ├── cache.js        ← Redis 5-minute TTL
│   │   ├── rateLimit.js    ← 30 req/min per IP
│   │   └── cors.js
│   ├── server.js
│   └── package.json
│
└── docs/
    └── ARCHITECTURE.md
```

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in keys
node server.js         # runs on :4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # runs on :5173
```

## Environment Variables (backend/.env)
```
PORT=4000
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...        # for resume AI extraction
CORS_ORIGIN=http://localhost:5173
```

## Data Flow

1. User types role + city  →  Frontend calls POST /api/search
2. Backend fans out to 3 scrapers in parallel (Promise.allSettled)
3. Each scraper returns normalized JobResult[]
4. Backend deduplicates, sorts (priority companies first), strips undisclosed salaries
5. Redis caches result for 5 minutes keyed by role:city:companies
6. Frontend renders the 24-card grid, opens deep links on click

## Deployment

| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel (free tier) | Free |
| Backend | Railway | ~$5/mo |
| Redis | Upstash (10k req/day) | Free |
| Domain | Namecheap | ~$10/yr |
