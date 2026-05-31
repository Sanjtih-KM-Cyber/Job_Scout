import 'dotenv/config';
import express from 'express';
import cors from './middleware/cors.js';
import rateLimiter from './middleware/rateLimit.js';
import searchRouter   from './routes/search.js';
import resumeRouter   from './routes/resume.js';
import outreachRouter from './routes/outreach.js';
import companyRouter  from './routes/company.js';
import analyzeRouter  from './routes/analyze.js';
import healthRouter   from './routes/health.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '10mb' }));
app.use(cors);
app.use(rateLimiter);

app.use('/api/search',   searchRouter);
app.use('/api/resume',   resumeRouter);
app.use('/api/outreach', outreachRouter);
app.use('/api/company',  companyRouter);
app.use('/api/analyze',  analyzeRouter);
app.use('/api/health',   healthRouter);

app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ JobScout API → http://localhost:${PORT}`);
});
