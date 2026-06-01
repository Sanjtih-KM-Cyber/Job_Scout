// backend/scrapers/linkedin.js
// Routes through ScraperAPI to bypass LinkedIn's cloud IP blocks.
// Free tier: 1,000 credits/month — https://scraperapi.com
// Falls back to direct request if no ScraperAPI key is set.

import axios from 'axios';
import * as cheerio from 'cheerio';

const TIMEOUT = 20000;
const SCRAPER_KEY = process.env.SCRAPER_API_KEY;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function buildUrl(role, city, expRange) {
  const q = encodeURIComponent(role);
  const l = encodeURIComponent(`${city}, India`);
  let url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${q}&location=${l}&start=0`;
  if (expRange) {
    const level = expRange.min <= 1 ? '2' : expRange.min <= 3 ? '3' : expRange.min <= 5 ? '4' : '5';
    url += `&f_E=${level}`;
  }
  return url;
}

export async function scrapeLinkedIn({ role, city, expRange }) {
  const targetUrl = buildUrl(role, city, expRange);

  // Route through ScraperAPI if key is available
  const requestUrl = SCRAPER_KEY
    ? `http://api.scraperapi.com?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(targetUrl)}&render=false`
    : targetUrl;

  if (SCRAPER_KEY) {
    console.log('[LinkedIn] Using ScraperAPI proxy');
  }

  try {
    const { data: html } = await axios.get(requestUrl, {
      headers: HEADERS,
      timeout: TIMEOUT,
    });

    const jobs = parseLinkedInHtml(html, role, city);

    if (jobs.length > 0) {
      console.log(`[LinkedIn] ✅ ${jobs.length} jobs for "${role}" in ${city}`);
      return jobs;
    }

    // Try fallback search page
    return await linkedInFallback(role, city);
  } catch (err) {
    console.error('[LinkedIn]', err.message);
    return await linkedInFallback(role, city);
  }
}

async function linkedInFallback(role, city) {
  const q   = encodeURIComponent(role);
  const l   = encodeURIComponent(`${city}, India`);
  const url = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;

  const proxyUrl = SCRAPER_KEY
    ? `http://api.scraperapi.com?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}`
    : url;

  try {
    const { data: html } = await axios.get(proxyUrl, { headers: HEADERS, timeout: TIMEOUT });
    const jobs = parseLinkedInHtml(html, role, city);
    if (jobs.length > 0) console.log(`[LinkedIn fallback] ✅ ${jobs.length} jobs`);
    else console.log('[LinkedIn] 0 jobs — IP may be blocked (add SCRAPER_API_KEY to fix)');
    return jobs;
  } catch (err) {
    console.error('[LinkedIn fallback]', err.message);
    return [];
  }
}

function parseLinkedInHtml(html, role, city) {
  const $ = cheerio.load(html);
  const jobs = [];

  const selectors = [
    'li',
    '[data-occludable-job-id]',
    '.base-card',
    '.jobs-search__results-list li',
  ];

  for (const sel of selectors) {
    $(sel).each((i, el) => {
      if (i >= 12) return false;
      const title    = $(el).find('.base-search-card__title, h3, [class*="job-title"]').first().text().trim();
      const company  = $(el).find('.base-search-card__subtitle, h4, [class*="company-name"]').first().text().trim();
      const location = $(el).find('.job-search-card__location, [class*="location"]').first().text().trim();
      const posted   = $(el).find('time').attr('datetime') || '';
      const href     = $(el).find('a.base-card__full-link, a[href*="/jobs/view"]').first().attr('href')
                    || $(el).find('a').first().attr('href');

      if (title && company && title.length > 2) {
        jobs.push({
          title:     title.trim(),
          company:   company.replace(/\n.*/s, '').trim(),
          city:      location || city,
          portal:    'linkedin',
          salary:    null,
          posted:    posted ? humanizeDate(posted) : 'Recently',
          sourceUrl: href ? (href.startsWith('http') ? href : `https://www.linkedin.com${href}`) : null,
          priority:  false,
        });
      }
    });
    if (jobs.length > 0) break; // stop at first selector that works
  }

  return jobs;
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
