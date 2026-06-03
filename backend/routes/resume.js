// backend/routes/resume.js
// Supports PDF + DOCX resume uploads
import { Router } from 'express';
import multer from 'multer';
import Groq from 'groq-sdk';

const router = Router();

// Accept both PDF and DOCX
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF or Word documents accepted'));
  },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── PDF text extraction (3 fallback methods) ─────────────────────────────────
async function extractPdfText(buffer) {
  try {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    if (data.text?.trim()) return data.text.slice(0, 6000);
  } catch (e) { console.error('[PDF M1]', e.message); }

  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    if (data.text?.trim()) return data.text.slice(0, 6000);
  } catch (e) { console.error('[PDF M2]', e.message); }

  try {
    const text = buffer.toString('latin1');
    const chunks = [];
    const regex = /[\x20-\x7E\n\r\t]{4,}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const chunk = match[0].trim();
      if (chunk.length > 3 && !/^[\d\s.]+$/.test(chunk)) chunks.push(chunk);
    }
    const extracted = chunks.join(' ').replace(/\s+/g, ' ').slice(0, 6000);
    if (extracted.length > 100) return extracted;
  } catch (e) { console.error('[PDF M3]', e.message); }

  return null;
}

// ── DOCX text extraction ──────────────────────────────────────────────────────
async function extractDocxText(buffer) {
  try {
    const mammoth = await import('mammoth');
    const result  = await mammoth.extractRawText({ buffer });
    return result.value?.slice(0, 6000) || null;
  } catch (e) {
    console.error('[DOCX]', e.message);
    return null;
  }
}

router.post('/parse', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Resume] Received:', req.file.originalname, req.file.mimetype, req.file.size, 'bytes');

    const isDocx = req.file.mimetype.includes('word') || req.file.originalname.endsWith('.docx');
    const rawText = isDocx
      ? await extractDocxText(req.file.buffer)
      : await extractPdfText(req.file.buffer);

    if (!rawText) {
      return res.status(422).json({
        error: 'Could not extract text. Make sure it\'s not a scanned image.',
      });
    }

    console.log('[Resume] Extracted', rawText.length, 'chars — sending to Groq');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: 'You are a resume parser. Extract job search parameters and return ONLY valid JSON — no markdown, no explanation.',
        },
        {
          role: 'user',
          content: `Extract job search parameters from this resume.

Resume:
${rawText}

Return exactly this JSON:
{
  "role": "most recent or target job title",
  "city": "city from contact info or most recent job (India city preferred)",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "experienceYears": 4,
  "suggestedExperience": "3-5",
  "summary": "2-sentence professional summary of this candidate"
}

For suggestedExperience choose one of: "fresher", "1-3", "3-5", "5-8", "8+"
Extract at least 5-8 specific technical/domain skills from the resume.`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    console.log('[Resume] Parsed:', parsed.role, '|', parsed.city, '|', parsed.skills?.length, 'skills');

    res.json({
      role:                parsed.role                || '',
      city:                parsed.city                || '',
      skills:              parsed.skills              || [],
      experienceYears:     parsed.experienceYears     || 0,
      suggestedExperience: parsed.suggestedExperience || 'any',
      summary:             parsed.summary             || '',
    });
  } catch (err) {
    console.error('[Resume Error]', err.message);
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'Could not parse AI response. Try again.' });
    }
    next(err);
  }
});

export default router;
