# JobScout AI — Complete Architecture

## Feature → Code Map

| Feature | Backend | Frontend |
|---------|---------|----------|
| AI Resume Matcher | routes/resume.js | components/ResumeUpload.jsx |
| Role-First Discovery | routes/search.js (3-scraper fan-out) | components/SearchPanel.jsx |
| Multi-Word Scrubbing | — | utils/helpers.js scrubInput() |
| Priority Bias | routes/search.js (pin + fill) | components/CompanyChips.jsx |
| Salary Honesty | routes/search.js isRealSalary() | components/JobCard.jsx (null = no badge) |
| 1-to-1 Deep Links | — | utils/helpers.js buildLink() |
| 5-Job Integrity Pledge | routes/search.js (no padding) | App.jsx integrity-badge |
| Refresh Pipeline Flush | routes/search.js excludeCompanies | hooks/useJobSearch.js seenCompaniesRef |
| Recruiter Outreach | routes/outreach.js (Claude AI) | hooks/useOutreach.js + OutreachModal.jsx |
| Experience Filter | routes/search.js EXP_MAP | components/SearchPanel.jsx select |
| Dark / Light Mode | — | hooks/useTheme.js + CSS data-theme |
| Saved Searches | — | hooks/useSavedSearches.js localStorage |

## Deployment

### Backend → Railway
1. Link /backend folder, add nixpacks.toml for Chromium
2. Env vars: PORT, REDIS_URL, ANTHROPIC_API_KEY, CORS_ORIGIN, CHROME_PATH

### Frontend → Vercel
1. Link /frontend folder
2. Env var: VITE_API_URL=https://your-backend.railway.app/api

### Redis → Upstash (free tier)
5-minute TTL cache, keyed by role:city:experience:companies
