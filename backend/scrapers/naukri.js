// backend/scrapers/naukri.js
// Uses Naukri's internal jobs JSON API — far more reliable than HTML scraping.
// No auth needed. Returns clean structured data directly.

import axios from 'axios';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Referer': 'https://www.naukri.com/',
  'appid': '109',
  'systemid': 'Naukri',
};

export async function scrapeNaukri({ role, city, expRange }) {
  // Try JSON API first, fall back to HTML scrape
  const result = await tryNaukriAPI(role, city, expRange)
    || await tryNaukriHTML(role, city, expRange);
  return result || [];
}

// Strategy 1: Naukri's internal search JSON API
async function tryNaukriAPI(role, city, expRange) {
  try {
    const keyword  = encodeURIComponent(role);
    const location = encodeURIComponent(city);
    const expMin   = expRange?.min ?? 0;
    const expMax   = expRange?.max ?? 30;

    const url = `https://www.naukri.com/jobapi/v3/search?noOfResults=12&urlType=search_by_key_loc&searchType=adv&keyword=${keyword}&location=${location}&experience=${expMin}&expMax=${expMax}&jobAge=3&src=jobsearchDesk&functionName=&sortBy=r`;

    const { data } = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000,
    });

    const jobList = data?.jobDetails || data?.jobs || [];
    if (!jobList.length) return null;

    console.log(`[Naukri API] ✅ Got ${jobList.length} jobs`);

    return jobList.slice(0, 10).map(job => ({
      title:     job.title        || job.jobTitle    || '',
      company:   job.companyName  || job.company     || '',
      city:      (job.placeholders?.find(p => p.type === 'location')?.label)
               || job.location   || city,
      portal:    'naukri',
      salary:    cleanNaukriSalary(
                   job.placeholders?.find(p => p.type === 'salary')?.label
                   || job.salary
                 ),
      experience:job.placeholders?.find(p => p.type === 'experience')?.label
               || job.experience || null,
      posted:    job.footerPlaceholderLabel || job.createdDate || 'Recently',
      sourceUrl: job.jdURL || job.jobUrl || `https://www.naukri.com`,
      priority:  false,
    }));
  } catch (err) {
    console.log('[Naukri API] failed:', err.message, '— trying HTML fallback');
    return null;
  }
}

// Strategy 2: HTML fallback with updated 2024 selectors
async function tryNaukriHTML(role, city, expRange) {
  const { default: axios } = await import('axios');
  const cheerio = await import('cheerio');

  try {
    const rolePath = role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cityPath = city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const expParam = expRange ? `&experience=${expRange.min}&expMax=${expRange.max}` : '';
    const url = `https://www.naukri.com/${rolePath}-jobs-in-${cityPath}?k=${encodeURIComponent(role)}&l=${encodeURIComponent(city)}${expParam}`;

    const { data: html } = await axios.get(url, {
      headers: { ...HEADERS, Accept: 'text/html' },
      timeout: 12000,
    });

    const $ = cheerio.load(html);
    const jobs = [];

    $('.srp-jobtuple-wrapper, article.jobTuple').each((i, el) => {
      if (i >= 10) return false;
      const title   = $(el).find('.title a, .row1 a').first().text().trim();
      const company = $(el).find('.comp-name, .row2 .comp-name').first().text().trim();
      const loc     = $(el).find('.locWdth, .location').first().text().trim();
      const exp     = $(el).find('.expwdth, .experience').first().text().trim();
      const sal     = $(el).find('.sal-wrap span, .salary').first().text().trim();
      const href    = $(el).find('.title a').first().attr('href');

      if (title && company) {
        jobs.push({
          title, company,
          city:     loc || city,
          portal:   'naukri',
          salary:   cleanNaukriSalary(sal),
          experience: exp || null,
          posted:   'Recently',
          sourceUrl: href || url,
          priority: false,
        });
      }
    });

    if (jobs.length > 0) console.log(`[Naukri HTML] ✅ Got ${jobs.length} jobs`);
    return jobs;
  } catch (err) {
    console.error('[Naukri HTML]', err.message);
    return [];
  }
}

function cleanNaukriSalary(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.toLowerCase().includes('not disclosed')) return null;
  if (/\d/.test(raw)) return raw.replace(/\s+/g, ' ').trim();
  return null;
}
