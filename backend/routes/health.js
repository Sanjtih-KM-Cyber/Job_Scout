// backend/routes/health.js
import { Router } from 'express';
import redis from '../middleware/cache.js';

const router = Router();

router.get('/', async (req, res) => {
  let redisOk = false;
  try {
    await redis.ping();
    redisOk = true;
  } catch {}

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      redis: redisOk,
    },
  });
});

export default router;
