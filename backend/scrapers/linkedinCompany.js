// backend/scrapers/linkedinCompany.js
// Company Intel mode — searches LinkedIn for jobs at a specific company + sector.
// Strategy: search "{company} {sector} jobs" broadly, then filter by company name.

import axios from 'axios';
import * as cheerio from 'cheerio';

const TIMEOUT = 12000;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.linkedin.com/',
};

export async function scrapeLinkedInCompany({ company, sector, city }) {
  try {
    // Build keyword: put company first so LinkedIn prioritises it
    const keywords = sector
      ? `${company} ${sector}`
      : `${company} jobs`;

    const q = encodeURIComponent(keywords);
    const l = city
      ? encodeURIComponent(`${city}, India`)
      : encodeURIComponent('India');

    // Try jobs-guest API first
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${q}&location=${l}&start=0`;

    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
    const $ = cheerio.load(html);
    const jobs = [];

    $('li').each((i, el) => {
      if (i >= 15) return false;

      const title    = $(el).find('.base-search-card__title, h3').first().text().trim();
      const comp     = $(el).find('.base-search-card__subtitle, h4').first().text().trim();
      const location = $(el).find('.job-search-card__location').first().text().trim();
      const posted   = $(el).find('time').attr('datetime') || '';
      const href     = $(el).find('a.base-card__full-link, a[href*="/jobs/view"]').first().attr('href')
                    || $(el).find('a').first().attr('href');

      if (title && comp) {
        jobs.push({
          title,
          company:   comp.replace(/\n.*/s, '').trim(),
          city:      location || city || 'India',
          portal:    'linkedin',
          salary:    null,
          posted:    posted ? humanizeDate(posted) : 'Recently',
          sourceUrl: href
            ? (href.startsWith('http') ? href : `https://www.linkedin.com${href}`)
            : null,
          priority:  false,
        });
      }
    });

    // Soft filter — keep jobs where company name partially matches
    // Use first word of company as minimum bar (e.g. "Infosys" matches "Infosys BPM")
    const companyWords = company.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const filtered = jobs.filter(job => {
      const jobComp = job.company.toLowerCase();
      return companyWords.some(w => jobComp.includes(w));
    });

    // If strict filter kills everything, return all results (better than nothing)
    const result = filtered.length > 0 ? filtered : jobs;

    console.log(`[LinkedIn Company] ✅ ${result.length} jobs at "${company}"${sector ? ` · ${sector}` : ''}`);
    return result.slice(0, 10);

  } catch (err) {
    console.error('[LinkedIn Company]', err.message);
    // Fallback to regular search page
    return await linkedinCompanyFallback({ company, sector, city });
  }
}

async function linkedinCompanyFallback({ company, sector, city }) {
  try {
    const keywords = sector ? `${company} ${sector}` : company;
    const q = encodeURIComponent(keywords);
    const l = city ? encodeURIComponent(`${city}, India`) : encodeURIComponent('India');
    const url = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;

    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
    const $ = cheerio.load(html);
    const jobs = [];

    $('[data-occludable-job-id], .base-card').each((i, el) => {
      if (i >= 10) return false;

      const title    = $(el).find('[class*="job-title"], .base-search-card__title, h3').first().text().trim();
      const comp     = $(el).find('[class*="company-name"], .base-search-card__subtitle, h4').first().text().trim();
      const location = $(el).find('[class*="location"], .job-search-card__location').first().text().trim();
      const href     = $(el).find('a[href*="/jobs/view"], a.base-card__full-link').first().attr('href')
                    || $(el).find('a').first().attr('href');

      if (title && comp) {
        jobs.push({
          title, company: comp.replace(/\n.*/s, '').trim(),
          city: location || city || 'India',
          portal: 'linkedin', salary: null, posted: 'Recently',
          sourceUrl: href ? (href.startsWith('http') ? href : `https://www.linkedin.com${href}`) : null,
          priority: false,
        });
      }
    });

    const companyWords = company.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const filtered = jobs.filter(j => companyWords.some(w => j.company.toLowerCase().includes(w)));
    const result = filtered.length > 0 ? filtered : jobs;

    console.log(`[LinkedIn Company fallback] ✅ ${result.length} jobs`);
    return result.slice(0, 10);
  } catch (err) {
    console.error('[LinkedIn Company fallback]', err.message);
    return [];
  }
}

function humanizeDate(dateStr) {
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    const h  = Math.floor(ms / 3_600_000);
    if (h < 1)  return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return 'Recently'; }
}
