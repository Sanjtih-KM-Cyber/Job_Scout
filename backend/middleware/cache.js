// backend/middleware/cache.js
// Cache rules:
//   - Initial search (page 1): cache for 5 min — same query in same session is fast
//   - Refresh (page > 1): ALWAYS skip cache, always hit live scrapers
//   - Every unique role+city+experience combo is a completely separate cache entry
//     so switching from Finance to SDE never returns Finance results

const memCache = new Map();
const TTL_MS   = 5 * 60 * 1000; // 5 minutes

let redis = null;
let redisOk = false;

if (process.env.REDIS_URL) {
  try {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    });
    redis.on('ready', () => { redisOk = true; });
    redis.on('error', () => { redisOk = false; });
  } catch { /* skip */ }
}

export function buildCacheKey({ role, city, experience, priorityCompanies = [], refreshPage = 1 }) {
  const cos = [...priorityCompanies].sort().join(',');
  // Each refreshPage is its own key — page 2, 3 etc are never served from page 1's cache
  // Role + city are always part of the key so Finance never bleeds into SDE results
  return [
    'js',
    (role  || '').toLowerCase().trim(),
    (city  || '').toLowerCase().trim(),
    (experience || 'any'),
    cos,
    `p${refreshPage}`,
  ].join(':');
}

export async function cacheMiddleware(req, res, next) {
  const { refreshPage = 1 } = req.body;

  // ── Refresh = always live, never cached ──────────────────────────────
  if (refreshPage > 1) {
    res.locals.cacheKey = buildCacheKey(req.body);
    return next(); // skip cache read entirely
  }

  // ── Initial search — check cache ─────────────────────────────────────
  const key = buildCacheKey(req.body);
  res.locals.cacheKey = key;

  // Memory cache
  const mem = memCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return res.json({ ...mem.data, cached: true });
  }

  // Redis cache (optional)
  if (redis && redisOk) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        const data = JSON.parse(raw);
        memCache.set(key, { data, expiresAt: Date.now() + TTL_MS });
        return res.json({ ...data, cached: true });
      }
    } catch { /* fall through */ }
  }

  next();
}

export async function writeCache(key, data) {
  // Only cache page-1 results (initial searches)
  // Refresh pages are never cached — they should always be live
  if (key.endsWith(':p1') || key.includes(':p1:')) {
    memCache.set(key, { data, expiresAt: Date.now() + TTL_MS });
    if (redis && redisOk) {
      try { await redis.setex(key, 300, JSON.stringify(data)); } catch { /* skip */ }
    }
  }
  // p2, p3, p4 etc — never written to cache, always fetched live
}

// Prune expired memory entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (v.expiresAt < now) memCache.delete(k);
  }
}, 10 * 60 * 1000);

export default redis;
