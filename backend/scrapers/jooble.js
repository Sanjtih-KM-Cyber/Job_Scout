// backend/scrapers/jooble.js
import axios from 'axios';

const JOOBLE_KEY = process.env.JOOBLE_API_KEY;

const STOP = new Set([
  'a','an','the','and','or','of','in','at','to','for','with',
  'on','is','are','be','as','by','it','its','sr','jr',
  'senior','junior','lead','head','chief','associate',
]);

function tokenize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

export async function scrapeJooble({ role, city, expRange }) {
  if (!JOOBLE_KEY) {
    console.warn('[Jooble] No JOOBLE_API_KEY set');
    return [];
  }

  try {
    const { data } = await axios.post(
      `https://jooble.org/api/${JOOBLE_KEY}`,
      {
        keywords:      role,
        location:      `${city}, India`,
        page:          1,
        resultsOnPage: 15, // fetch more so filtering doesn't empty the list
      },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const allJobs  = data?.jobs || [];
    const roleWords = tokenize(role);

    // Keep only jobs where the title shares at least one meaningful word with the role
    const relevant = allJobs.filter(job => {
      const titleWords = tokenize(job.title || '');
      return roleWords.some(w => titleWords.includes(w));
    });

    // If filter kills everything, fall back to all results (better than blank)
    const jobs = relevant.length > 0 ? relevant : allJobs;

    console.log(`[Jooble] ✅ ${jobs.length}/${allJobs.length} relevant jobs for "${role}" in ${city}`);

    return jobs.slice(0, 10).map(job => ({
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
