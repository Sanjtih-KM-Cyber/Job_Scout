// backend/middleware/cache.js
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
  // Include refreshPage in key — each refresh page is a distinct query
  return `js:${role.toLowerCase().trim()}:${city.toLowerCase().trim()}:${experience || 'any'}:${cos}:p${refreshPage}`;
}

export async function cacheMiddleware(req, res, next) {
  const { refreshPage = 1 } = req.body;
  const key = buildCacheKey(req.body);
  res.locals.cacheKey = key;

  // Never serve cache on a refresh — always fetch fresh jobs
  if (refreshPage > 1) {
    return next();
  }

  // Check in-memory cache for page 1 (initial search only)
  const mem = memCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return res.json({ ...mem.data, cached: true });
  }

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
  memCache.set(key, { data, expiresAt: Date.now() + TTL_MS });
  if (redis && redisOk) {
    try {
      await redis.setex(key, 300, JSON.stringify(data));
    } catch { /* skip */ }
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (v.expiresAt < now) memCache.delete(k);
  }
}, 10 * 60 * 1000);

export default redis;
