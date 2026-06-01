// backend/routes/resume.js
import { Router } from 'express';
import multer from 'multer';
import Groq from 'groq-sdk';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') cb(new Error('Only PDF files accepted'));
    else cb(null, true);
  },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/parse', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Use createRequire to avoid pdf-parse's broken ESM test file loading on Linux
    let rawText = '';
    try {
      const pdfParse = require('pdf-parse');
      const pdfData  = await pdfParse(req.file.buffer);
      rawText = pdfData.text?.slice(0, 6000) || '';
    } catch (pdfErr) {
      console.error('[PDF Parse]', pdfErr.message);
      return res.status(422).json({
        error: 'Could not read this PDF. Make sure it is not a scanned image.',
      });
    }

    if (!rawText.trim()) {
      return res.status(422).json({
        error: 'Could not extract text from this PDF. Is it a scanned image?',
      });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'You are a resume parser. Extract job search parameters and return ONLY valid JSON — no markdown, no explanation.',
        },
        {
          role: 'user',
          content: `Extract job search parameters from this resume text.

Resume:
${rawText}

Return exactly this JSON shape:
{
  "role": "most recent or target job title (e.g. Senior Software Engineer)",
  "city": "city from contact info or most recent job (India city preferred)",
  "skills": ["skill1", "skill2", "skill3"],
  "experienceYears": 4,
  "suggestedExperience": "3-5"
}

For suggestedExperience choose exactly one of: "fresher", "1-3", "3-5", "5-8", "8+"`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({
      role:                parsed.role                || '',
      city:                parsed.city                || '',
      skills:              parsed.skills              || [],
      experienceYears:     parsed.experienceYears     || 0,
      suggestedExperience: parsed.suggestedExperience || 'any',
    });
  } catch (err) {
    console.error('[Resume Parse Error]', err.message);
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'Could not parse AI response. Try again.' });
    }
    next(err);
  }
});

export default router;
