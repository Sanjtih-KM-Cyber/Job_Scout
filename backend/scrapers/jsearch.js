// backend/scrapers/jsearch.js
// JSearch API via RapidAPI — https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Pulls real-time jobs from LinkedIn, Indeed, Glassdoor, ZipRecruiter.
// Free tier: 500 requests/month.
// Proper location filtering, fresh jobs only, full JD text available.

import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

const STOP = new Set([
  'a','an','the','and','or','of','in','at','to','for','with',
  'on','is','are','be','as','by','it','its','sr','jr','we','you',
  'senior','junior','lead','head','chief','associate','looking',
  'seeking','experience','years','minimum','required','strong',
]);

function tokenize(str) {
  return (str || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

/**
 * Score how well a job matches the role based on title + description.
 * Returns 0-100. Jobs under 20 are filtered out.
 */
function relevanceScore(job, role) {
  const roleWords   = tokenize(role);
  const titleWords  = tokenize(job.job_title || '');
  const descWords   = tokenize((job.job_description || '').slice(0, 1000));

  let score = 0;

  // Title match — strongest signal (up to 60 pts)
  const titleMatches = roleWords.filter(w => titleWords.includes(w));
  score += titleMatches.length * 20;

  // Description match — secondary signal (up to 40 pts)
  const descMatches = roleWords.filter(w => descWords.includes(w));
  score += Math.min(40, descMatches.length * 10);

  return Math.min(100, score);
}

export async function scrapeJSearch({ role, city, expRange }, page = 1) {
  if (!RAPIDAPI_KEY) {
    console.warn('[JSearch] No RAPIDAPI_KEY set — get free key at rapidapi.com/jsearch');
    return [];
  }

  try {
    const query = `${role} in ${city} India`;

    const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
      timeout: 12000,
      headers: {
        'X-RapidAPI-Key':  RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      params: {
        query,
        page,
        num_pages:          1,
        date_posted:        'month',   // only last 30 days — no stale jobs
        employment_types:   'FULLTIME,CONTRACTOR',
        job_requirements:   expRange
          ? expRange.min <= 1  ? 'NO_EXPERIENCE'
          : expRange.min <= 3  ? 'UNDER_3_YEARS_EXPERIENCE'
          : 'MORE_THAN_3_YEARS_EXPERIENCE'
          : undefined,
      },
    });

    const allJobs = data?.data || [];

    // Filter by relevance — title AND description must match the role
    const relevant = allJobs
      .map(job => ({ job, score: relevanceScore(job, role) }))
      .filter(({ score }) => score >= 20)
      .sort((a, b) => b.score - a.score)
      .map(({ job }) => job);

    console.log(`[JSearch] ✅ ${relevant.length}/${allJobs.length} relevant jobs for "${role}" in ${city}`);

    return relevant.slice(0, 12).map(job => ({
      title:     job.job_title                  || role,
      company:   job.employer_name              || 'Company',
      city:      job.job_city || job.job_state  || city,
      portal:    mapPortal(job.job_apply_link),
      salary:    formatSalary(job),
      experience: expRange ? `${expRange.min}–${expRange.max} yrs` : null,
      posted:    humanizeDate(job.job_posted_at_timestamp),
      sourceUrl: job.job_apply_link             || null,
      priority:  false,
    }));
  } catch (err) {
    const status = err.response?.status;
    console.error(`[JSearch] ${status || ''} ${err.message}`);
    return [];
  }
}

function mapPortal(url = '') {
  if (url.includes('linkedin'))  return 'linkedin';
  if (url.includes('indeed'))    return 'indeed';
  if (url.includes('glassdoor')) return 'naukri';
  return 'indeed';
}

function formatSalary(job) {
  const min = job.job_min_salary;
  const max = job.job_max_salary;
  const per = job.job_salary_period;
  if (!min && !max) return null;

  // Convert to LPA if yearly
  if (per === 'YEAR') {
    const fmt = n => `₹${Math.round(n / 100000)}L`;
    if (min && max) return `${fmt(min)} – ${fmt(max)} PA`;
    if (min)        return `${fmt(min)}+ PA`;
  }
  return null;
}

function humanizeDate(timestamp) {
  if (!timestamp) return 'Recently';
  try {
    const ms = Date.now() - (timestamp * 1000);
    const h  = Math.floor(ms / 3_600_000);
    if (h < 1)  return 'Just now';
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return `${Math.floor(d / 30)}mo ago`;
  } catch { return 'Recently'; }
}
