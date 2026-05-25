// backend/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export default rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 30,               // 30 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a moment before searching again.',
    retryAfter: 60,
  },
  skip: (req) => req.path === '/api/health', // health check exempt
});
