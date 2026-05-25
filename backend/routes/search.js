// backend/routes/search.js
import { Router } from 'express';
import { cacheMiddleware, writeCache } from '../middleware/cache.js';
import { scrapeLinkedIn } from '../scrapers/linkedin.js';
import { scrapeAdzuna }   from '../scrapers/adzuna.js';
import pLimit from 'p-limit';

const router = Router();

const EXP_MAP = {
  fresher: { min: 0, max: 1 },
  '1-3':   { min: 1, max: 3 },
  '3-5':   { min: 3, max: 5 },
  '5-8':   { min: 5, max: 8 },
  '8+':    { min: 8, max: 30 },
};

router.post('/', cacheMiddleware, async (req, res, next) => {
  try {
    const {
      role,
      city,
      experience      = 'any',
      priorityCompanies = [],
      excludeCompanies  = [],
      refreshPage       = 1,
    } = req.body;

    if (!role?.trim() || !city?.trim()) {
      return res.status(400).json({ error: 'role and city are required' });
    }

    const expRange = EXP_MAP[experience] || null;
    const params   = { role: role.trim(), city: city.trim(), expRange, experience };

    // Fan-out: LinkedIn + Adzuna page A + Adzuna page B
    const limit = pLimit(3);
    const [linkedInResult, adzunaResult1, adzunaResult2] = await Promise.allSettled([
      limit(() => scrapeLinkedIn(params)),
      limit(() => scrapeAdzuna(params, 'indeed', refreshPage)),
      limit(() => scrapeAdzuna(params, 'naukri', refreshPage + 1)),
    ]);

    let jobs = [];
    for (const result of [linkedInResult, adzunaResult1, adzunaResult2]) {
      if (result.status === 'fulfilled') jobs.push(...result.value);
      else console.warn('[Search] Source failed:', result.reason?.message);
    }

    // Salary Honesty — strip anything not a real number
    jobs = jobs.map(job => ({
      ...job,
      salary: isRealSalary(job.salary) ? job.salary : null,
    }));

    // Deduplication by title+company
    const seenKeys = new Set();
    jobs = jobs.filter(job => {
      const key = `${job.title?.toLowerCase()}:${job.company?.toLowerCase()}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Refresh Pipeline Flush — only apply if enough fresh results remain
    if (excludeCompanies.length > 0) {
      const lowerExclude = excludeCompanies.map(c => c.toLowerCase());
      const fresh = jobs.filter(j => !lowerExclude.includes(j.company?.toLowerCase()));
      if (fresh.length >= 4) jobs = fresh;
    }

    // ── Priority Bias ──────────────────────────────────────────────────────
    // RULE: Priority companies are a HINT, not a filter.
    // - If a priority company appears in real results → pin it to the top
    // - If it does NOT appear → do NOT invent a card. Just leave it out.
    // - All other companies always show below the pinned ones.
    if (priorityCompanies.length > 0) {
      const lowerPriority = priorityCompanies.map(c => c.toLowerCase());

      const pinned = jobs
        .filter(j => lowerPriority.includes(j.company?.toLowerCase()))
        .map(j => ({ ...j, priority: true }));

      const rest = jobs
        .filter(j => !lowerPriority.includes(j.company?.toLowerCase()));

      // Pinned first, then all other real results — no fabrications
      jobs = [...pinned, ...rest];
    }

    jobs = jobs.slice(0, 24);

    const payload = {
      jobs,
      meta: {
        role: role.trim(),
        city: city.trim(),
        experience,
        priorityCompanies,
        total: jobs.length,
        timestamp: new Date().toISOString(),
        portals: ['linkedin', 'indeed', 'naukri'],
      },
      cached: false,
    };

    await writeCache(res.locals.cacheKey, payload);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

function isRealSalary(salary) {
  if (!salary || typeof salary !== 'string') return false;
  const lower = salary.toLowerCase();
  if (lower.includes('not disclosed') || lower.includes('na') || lower === '') return false;
  return /[\d,]+/.test(salary);
}

export default router;
