// backend/scrapers/adzunaCompany.js
// Adzuna free tier does NOT support the `company` filter param — causes 400.
// Instead we bake the company name into `what_and` so results are specific.

import axios from 'axios';

const APP_ID  = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;

export async function scrapeAdzunaCompany({ company, sector, city }, page = 1) {
  if (!APP_ID || !APP_KEY) {
    console.warn('[Adzuna Company] Missing credentials');
    return [];
  }

  try {
    const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}`;

    // Combine sector + company into one keyword string — no separate company param
    const keyword = sector
      ? `${sector} ${company}`   // e.g. "Finance Infosys"
      : company;                  // e.g. "Infosys"

    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' },
      params: {
        app_id:           APP_ID,
        app_key:          APP_KEY,
        results_per_page: 12,
        what_and:         keyword,
        where:            city || 'India',
        sort_by:          'relevance',
      },
    });

    const results = data?.results || [];
    console.log(`[Adzuna Company p${page}] ✅ ${results.length} jobs for "${keyword}"`);

    return results.map(job => ({
      title:     job.title                                           || sector || 'Role',
      company:   job.company?.display_name                          || company,
      city:      job.location?.display_name?.split(',')?.[0]?.trim() || city || 'India',
      portal:    'indeed',
      salary:    formatSalary(job.salary_min, job.salary_max),
      experience: null,
      posted:    humanizeDate(job.created),
      sourceUrl: job.redirect_url || null,
      priority:  false,
    }));
  } catch (err) {
    const detail = err.response?.data?.exception || err.message;
    console.error(`[Adzuna Company p${page}]`, detail);
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
