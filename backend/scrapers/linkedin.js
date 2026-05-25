// backend/scrapers/linkedin.js
// Uses LinkedIn's public job search API endpoint (no login, no Puppeteer needed)
// Much faster than browser scraping, works reliably without Chrome.

import axios from 'axios';
import * as cheerio from 'cheerio';

const TIMEOUT = 12000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Referer': 'https://www.linkedin.com/',
};

export async function scrapeLinkedIn({ role, city, expRange }) {
  try {
    const q = encodeURIComponent(role);
    const l = encodeURIComponent(`${city}, India`);

    // LinkedIn's public jobs API — returns JSON, no auth needed
    let url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${q}&location=${l}&start=0`;

    if (expRange) {
      // LinkedIn experience levels: 1=Internship 2=Entry 3=Associate 4=Mid-Senior 5=Director
      const level = expRange.min <= 1 ? '2' : expRange.min <= 3 ? '3' : expRange.min <= 5 ? '4' : '5';
      url += `&f_E=${level}`;
    }

    const { data: html } = await axios.get(url, {
      headers: HEADERS,
      timeout: TIMEOUT,
    });

    // LinkedIn returns HTML fragments for job cards
    const $ = cheerio.load(html);
    const jobs = [];

    // Try both old and new LinkedIn card selectors
    const cards = $('li');

    cards.each((i, el) => {
      if (i >= 10) return false;

      const title   = $(el).find('.base-search-card__title, h3.base-search-card__title').first().text().trim()
                   || $(el).find('h3').first().text().trim();
      const company = $(el).find('.base-search-card__subtitle, h4.base-search-card__subtitle').first().text().trim()
                   || $(el).find('h4').first().text().trim();
      const location= $(el).find('.job-search-card__location').first().text().trim()
                   || $(el).find('[class*="location"]').first().text().trim();
      const posted  = $(el).find('time').attr('datetime') || '';
      const salary  = $(el).find('.job-search-card__salary-info').first().text().trim() || null;
      const href    = $(el).find('a.base-card__full-link, a[href*="/jobs/view"]').first().attr('href')
                   || $(el).find('a').first().attr('href');

      if (title && company) {
        jobs.push({
          title:     title.trim(),
          company:   company.replace(/\n.*/s, '').trim(),
          city:      location || city,
          portal:    'linkedin',
          salary:    salary || null,
          posted:    posted ? humanizeDate(posted) : 'Recently',
          sourceUrl: href ? (href.startsWith('http') ? href : `https://www.linkedin.com${href}`) : null,
          priority:  false,
        });
      }
    });

    // If the jobs-guest API returned nothing, try the regular search page
    if (jobs.length === 0) {
      return await scrapeLinkedInFallback(role, city, expRange);
    }

    console.log(`[LinkedIn] ✅ ${jobs.length} jobs for "${role}" in ${city}`);
    return jobs;

  } catch (err) {
    console.error('[LinkedIn]', err.message);
    // Try fallback on any error
    return await scrapeLinkedInFallback(role, city, expRange);
  }
}

// Fallback: hit the regular public search page
async function scrapeLinkedInFallback(role, city, expRange) {
  try {
    const q = encodeURIComponent(role);
    const l = encodeURIComponent(`${city}, India`);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;

    const { data: html } = await axios.get(url, {
      headers: HEADERS,
      timeout: TIMEOUT,
    });

    const $ = cheerio.load(html);
    const jobs = [];

    // Updated 2024 selectors
    $('[data-occludable-job-id], .jobs-search__results-list li, .base-card').each((i, el) => {
      if (i >= 10) return false;

      const title   = $(el).find('[class*="job-title"], .base-search-card__title, h3').first().text().trim();
      const company = $(el).find('[class*="company-name"], .base-search-card__subtitle, h4').first().text().trim();
      const location= $(el).find('[class*="location"], .job-search-card__location').first().text().trim();
      const posted  = $(el).find('time').attr('datetime') || '';
      const href    = $(el).find('a[href*="/jobs/view"], a.base-card__full-link').first().attr('href')
                   || $(el).find('a').first().attr('href');

      if (title && company) {
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

    if (jobs.length > 0) {
      console.log(`[LinkedIn fallback] ✅ ${jobs.length} jobs`);
    } else {
      console.log('[LinkedIn fallback] 0 jobs — LinkedIn may be blocking this IP temporarily');
    }

    return jobs;
  } catch (err) {
    console.error('[LinkedIn fallback]', err.message);
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
