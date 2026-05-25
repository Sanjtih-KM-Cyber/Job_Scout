// backend/middleware/cors.js
import corsLib from 'cors';

const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'https://jobscout-ai.vercel.app',   // ← replace with your prod domain
];

export default corsLib({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
