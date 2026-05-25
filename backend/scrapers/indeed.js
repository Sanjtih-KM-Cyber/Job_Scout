// backend/scrapers/indeed.js
// Indeed blocks direct HTML scraping with 403. 
// Strategy: use Indeed's internal jobs JSON endpoint which is more permissive,
// with proper browser-like headers and a rotating set of realistic User-Agents.

import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function scrapeIndeed({ role, city, expRange }) {
  // Try primary strategy first, fall back to alternate endpoint
  const result = await tryIndeedRSS(role, city, expRange)
    || await tryIndeedHTML(role, city, expRange);
  return result || [];
}

// Strategy 1: Indeed RSS feed — much more permissive than HTML, returns XML
async function tryIndeedRSS(role, city, expRange) {
  try {
    const q = encodeURIComponent(role);
    const l = encodeURIComponent(`${city}, India`);
    let url = `https://in.indeed.com/rss?q=${q}&l=${l}&sort=date`;
    if (expRange) {
      const lvl = expRange.max <= 2 ? 'entry_level' : expRange.max <= 5 ? 'mid_level' : 'senior_level';
      url += `&explvl=${lvl}`;
    }

    const { data: xml } = await axios.get(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(xml, { xmlMode: true });
    const jobs = [];

    $('item').slice(0, 10).each((_, el) => {
      const title   = $(el).find('title').first().text().trim();
      const link    = $(el).find('link').first().text().trim()
                   || $(el).find('guid').first().text().trim();
      const desc    = $(el).find('description').first().text();
      const pubDate = $(el).find('pubDate').first().text().trim();

      // Extract company and location from description HTML
      const $desc   = cheerio.load(desc);
      const company = $desc('b, strong').first().text().trim()
                   || extractPattern(desc, /Company:\s*([^\n<]+)/i);
      const location= extractPattern(desc, /Location:\s*([^\n<]+)/i) || city;
      const salary  = extractSalary(desc);

      if (title && (company || title)) {
        jobs.push({
          title,
          company: company || 'Company on Indeed',
          city:    location,
          portal:  'indeed',
          salary,
          posted:  pubDate ? humanizePubDate(pubDate) : 'Recently',
          sourceUrl: link || null,
          priority: false,
        });
      }
    });

    if (jobs.length > 0) {
      console.log(`[Indeed RSS] ✅ Got ${jobs.length} jobs`);
      return jobs;
    }
    return null; // trigger fallback
  } catch (err) {
    console.log('[Indeed RSS] failed:', err.message, '— trying HTML fallback');
    return null;
  }
}

// Strategy 2: HTML scrape with full browser headers + cookie jar approach
async function tryIndeedHTML(role, city, expRange) {
  try {
    const q  = encodeURIComponent(role);
    const l  = encodeURIComponent(`${city}`);
    const ua = randomUA();

    // First hit the homepage to get cookies
    const session = axios.create({
      timeout: 12000,
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      withCredentials: true,
    });

    let url = `https://in.indeed.com/jobs?q=${q}&l=${l}&sort=date&fromage=7`;
    if (expRange) {
      const lvl = expRange.max <= 2 ? 'entry_level' : expRange.max <= 5 ? 'mid_level' : 'senior_level';
      url += `&explvl=${lvl}`;
    }

    const { data: html } = await session.get(url);
    const $ = cheerio.load(html);
    const jobs = [];

    // Try multiple selectors — Indeed changes their DOM often
    const cardSelectors = [
      '[data-testid="slider_container"]',
      '.job_seen_beacon',
      '.resultContent',
      'td.resultContent',
    ];

    let cards = $([]);
    for (const sel of cardSelectors) {
      const found = $(sel);
      if (found.length > 0) { cards = found; break; }
    }

    cards.slice(0, 10).each((_, el) => {
      const title   = $(el).find('[data-testid="jobTitle"] a, .jobTitle a, h2.jobTitle a').first().text().trim();
      const company = $(el).find('[data-testid="company-name"], .companyName').first().text().trim();
      const loc     = $(el).find('[data-testid="text-location"], .companyLocation').first().text().trim();
      const salary  = $(el).find('[data-testid="attribute_snippet_testid"], .salary-snippet-container').first().text().trim() || null;
      const dateRaw = $(el).find('[data-testid="myJobsStateDate"], .date').first().text().trim();
      const href    = $(el).find('[data-testid="jobTitle"] a, .jobTitle a').first().attr('href');

      if (title && company) {
        jobs.push({
          title,
          company,
          city:     loc || city,
          portal:   'indeed',
          salary:   cleanSalary(salary),
          posted:   parseDateText(dateRaw),
          sourceUrl: href ? `https://in.indeed.com${href}` : null,
          priority: false,
        });
      }
    });

    if (jobs.length > 0) console.log(`[Indeed HTML] ✅ Got ${jobs.length} jobs`);
    else console.log('[Indeed HTML] 0 jobs parsed — site may have changed selectors');

    return jobs;
  } catch (err) {
    console.error('[Indeed HTML]', err.message);
    return [];
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractPattern(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim().replace(/<[^>]+>/g, '') : '';
}

function extractSalary(desc) {
  const m = desc.match(/₹[\d,\s\-–LPA]+|[\d,]+\s*-\s*[\d,]+\s*(?:LPA|lpa|per annum)/i);
  return m ? m[0].trim() : null;
}

function cleanSalary(raw) {
  if (!raw) return null;
  if (/₹|INR|\d/.test(raw)) return raw.trim();
  return null;
}

function humanizePubDate(pubDate) {
  try {
    const ms = Date.now() - new Date(pubDate).getTime();
    const h  = Math.floor(ms / 3_600_000);
    if (h < 1)  return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return 'Recently'; }
}

function parseDateText(text) {
  if (!text) return 'Recently';
  if (/just/i.test(text)) return 'Just now';
  const m = text.match(/(\d+)\s*(hour|day|hr)/i);
  if (!m) return 'Recently';
  return m[2].startsWith('h') ? `${m[1]}h ago` : `${m[1]}d ago`;
}
