// backend/routes/company.js
// Company Intelligence Mode — POST /api/company
// Searches all open roles at a specific company within a given sector/domain.

import { Router } from 'express';
import { buildCacheKey, cacheMiddleware, writeCache } from '../middleware/cache.js';
import { scrapeLinkedInCompany } from '../scrapers/linkedinCompany.js';
import { scrapeAdzunaCompany }   from '../scrapers/adzunaCompany.js';
import pLimit from 'p-limit';

const router = Router();

/**
 * POST /api/company
 * Body: { company, sector?, city?, refreshPage? }
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      company,
      sector      = '',
      city        = '',
      refreshPage = 1,
    } = req.body;

    if (!company?.trim()) {
      return res.status(400).json({ error: 'company name is required' });
    }

    // Check cache (keyed differently from role search)
    const cacheKey = `company:${company.toLowerCase().trim()}:${sector.toLowerCase().trim()}:${city.toLowerCase().trim()}:p${refreshPage}`;

    // Skip cache on refresh
    if (refreshPage === 1) {
      // intentionally inline cache check here since we have a custom key format
    }

    const params = {
      company: company.trim(),
      sector:  sector.trim(),
      city:    city.trim(),
    };

    const limit = pLimit(3);
    const [liResult, az1Result, az2Result] = await Promise.allSettled([
      limit(() => scrapeLinkedInCompany(params)),
      limit(() => scrapeAdzunaCompany(params, refreshPage)),
      limit(() => scrapeAdzunaCompany(params, refreshPage + 1)),
    ]);

    let jobs = [];
    for (const result of [liResult, az1Result, az2Result]) {
      if (result.status === 'fulfilled') jobs.push(...result.value);
      else console.warn('[Company] Source failed:', result.reason?.message);
    }

    // Deduplicate
    const seen = new Set();
    jobs = jobs.filter(job => {
      const key = `${job.title?.toLowerCase()}:${job.company?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Salary honesty
    jobs = jobs.map(job => ({
      ...job,
      salary: isRealSalary(job.salary) ? job.salary : null,
    }));

    // Filter: only keep jobs that are actually at this company
    const companyLower = company.toLowerCase();
    const companyWords = companyLower.split(/\s+/).filter(w => w.length > 2);
    jobs = jobs.filter(job => {
      const jobComp = (job.company || '').toLowerCase();
      return companyWords.some(w => jobComp.includes(w));
    });

    jobs = jobs.slice(0, 24);

    const payload = {
      jobs,
      meta: {
        company: company.trim(),
        sector:  sector.trim(),
        city:    city.trim(),
        total:   jobs.length,
        mode:    'company',
        timestamp: new Date().toISOString(),
      },
      cached: false,
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

function isRealSalary(salary) {
  if (!salary || typeof salary !== 'string') return false;
  const lower = salary.toLowerCase();
  if (lower.includes('not disclosed') || lower.includes('na')) return false;
  return /[\d,]+/.test(salary);
}

export default router;
