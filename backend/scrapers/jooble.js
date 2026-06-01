// backend/scrapers/jooble.js
// Jooble API — free, covers India jobs, works from server IPs.
// Get free key at: https://jooble.org/api/about
// No rate limits on free tier for reasonable usage.

import axios from 'axios';

const JOOBLE_KEY = process.env.JOOBLE_API_KEY;

export async function scrapeJooble({ role, city, expRange }) {
  if (!JOOBLE_KEY) {
    console.warn('[Jooble] No JOOBLE_API_KEY set');
    return [];
  }

  try {
    const { data } = await axios.post(
      `https://jooble.org/api/${JOOBLE_KEY}`,
      {
        keywords: role,
        location: `${city}, India`,
        page:     1,
        resultsOnPage: 10,
      },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const jobs = data?.jobs || [];
    console.log(`[Jooble] ✅ ${jobs.length} jobs for "${role}" in ${city}`);

    return jobs.map(job => ({
      title:     job.title    || role,
      company:   job.company  || 'Company',
      city:      job.location || city,
      portal:    'naukri',
      salary:    parseSalary(job.salary),
      experience: null,
      posted:    job.updated ? humanizeDate(job.updated) : 'Recently',
      sourceUrl: job.link     || null,
      priority:  false,
    }));
  } catch (err) {
    console.error('[Jooble]', err.message);
    return [];
  }
}

function parseSalary(sal) {
  if (!sal || typeof sal !== 'string') return null;
  if (/\d/.test(sal)) return sal.trim();
  return null;
}

function humanizeDate(iso) {
  if (!iso) return 'Recently';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const h  = Math.floor(ms / 3_600_000);
    if (h < 1)  return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return 'Recently'; }
}
