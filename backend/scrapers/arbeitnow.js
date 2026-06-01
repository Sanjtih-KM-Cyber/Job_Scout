// backend/scrapers/arbeitnow.js
// Arbeitnow Free Job Board API — https://arbeitnow.com/api
// No API key needed, no rate limits, works from any server IP.
// Has real location data and covers global + India jobs.

import axios from 'axios';

export async function scrapeArbeitnow({ role, city }) {
  try {
    const { data } = await axios.get('https://arbeitnow.com/api/job-board-api', {
      timeout: 10000,
      params: {
        q:        `${role} ${city}`,
        page:     1,
      },
      headers: { 'Accept': 'application/json' },
    });

    const jobs = data?.data || [];
    console.log(`[Arbeitnow] ✅ ${jobs.length} jobs for "${role}" in ${city}`);

    // Filter to only jobs that mention the city or India
    const cityLower = city.toLowerCase();
    const relevant  = jobs.filter(job => {
      const loc = (job.location || '').toLowerCase();
      return loc.includes(cityLower)
          || loc.includes('india')
          || loc.includes('remote')
          || loc === '';
    });

    return (relevant.length > 0 ? relevant : jobs).slice(0, 10).map(job => ({
      title:     job.title        || role,
      company:   job.company_name || 'Company',
      city:      job.location     || city,
      portal:    'naukri',
      salary:    null,
      experience: null,
      posted:    humanizeDate(job.created_at),
      sourceUrl: job.url          || null,
      priority:  false,
    }));
  } catch (err) {
    console.error('[Arbeitnow]', err.message);
    return [];
  }
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
