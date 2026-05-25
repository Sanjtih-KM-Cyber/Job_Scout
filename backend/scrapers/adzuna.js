// backend/scrapers/adzuna.js
import axios from 'axios';

const APP_ID  = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;

export async function scrapeAdzuna({ role, city }, portal = 'indeed', page = 1) {
  if (!APP_ID || !APP_KEY) {
    console.warn('[Adzuna] Missing credentials in .env');
    return [];
  }

  try {
    // Correct Adzuna India endpoint: /v1/api/jobs/in/search/{page}
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}`;

    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' },
      params: {
        app_id:           APP_ID,
        app_key:          APP_KEY,
        results_per_page: 10,
        what:             role,
        where:            city,
        sort_by:          'date',
      },
    });

    const results = data?.results || [];
    console.log(`[Adzuna p${page}] ✅ ${results.length} jobs for "${role}" in ${city}`);

    return results.map(job => ({
      title:     job.title                              || role,
      company:   job.company?.display_name             || 'Unknown Company',
      city:      job.location?.display_name?.split(',')?.[0]?.trim() || city,
      portal,
      salary:    formatSalary(job.salary_min, job.salary_max),
      experience: null,
      posted:    humanizeDate(job.created),
      sourceUrl: job.redirect_url || null,
      priority:  false,
    }));
  } catch (err) {
    // Log the actual response for easier debugging
    const status = err.response?.status;
    const detail = err.response?.data?.exception || err.message;
    console.error(`[Adzuna p${page}] ${status || ''} ${detail}`);
    return [];
  }
}

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = n => `₹${Math.round(n / 100000)}L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} PA`;
  if (min)        return `${fmt(min)}+ PA`;
  return null;
}

function humanizeDate(iso) {
  if (!iso) return 'Recently';
  const ms = Date.now() - new Date(iso).getTime();
  const h  = Math.floor(ms / 3_600_000);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
