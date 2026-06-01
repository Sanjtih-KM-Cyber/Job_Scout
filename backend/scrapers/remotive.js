// backend/scrapers/remotive.js
// Remotive — free public API, no key needed, no blocks, works from any server IP.
// Focused on tech/remote jobs but covers many domains.
// https://remotive.com/api/remote-jobs

import axios from 'axios';

export async function scrapeRemotive({ role, city }) {
  try {
    // Remotive search by job_type and search term
    const { data } = await axios.get('https://remotive.com/api/remote-jobs', {
      timeout: 10000,
      params: {
        search:   role,
        limit:    10,
      },
      headers: { 'Accept': 'application/json' },
    });

    const jobs = data?.jobs || [];
    console.log(`[Remotive] ✅ ${jobs.length} jobs for "${role}"`);

    return jobs.map(job => ({
      title:     job.title        || role,
      company:   job.company_name || 'Company',
      city:      job.candidate_required_location || city || 'Remote',
      portal:    'naukri',       // label as naukri for UI variety
      salary:    parseSalary(job.salary) || null,
      experience: null,
      posted:    humanizeDate(job.publication_date),
      sourceUrl: job.url || null,
      priority:  false,
    }));
  } catch (err) {
    console.error('[Remotive]', err.message);
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
  const ms = Date.now() - new Date(iso).getTime();
  const h  = Math.floor(ms / 3_600_000);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
