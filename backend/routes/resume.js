// backend/routes/resume.js
// Supports PDF + DOCX resume uploads
import { Router } from 'express';
import multer from 'multer';
import Groq from 'groq-sdk';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const ext = file.originalname.toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF or Word documents accepted'));
    }
  },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── PDF extraction ────────────────────────────────────────────────────────────
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

  // Raw ASCII fallback
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

// ── DOCX extraction — mammoth is the gold standard for .docx ─────────────────
async function extractDocxText(buffer) {
  // Method 1: mammoth (best quality, preserves structure)
  try {
    const mammoth = await import('mammoth');
    const result  = await mammoth.default.extractRawText({ buffer });
    const text    = result?.value?.trim();
    if (text && text.length > 50) {
      console.log('[DOCX] mammoth extracted', text.length, 'chars');
      return text.slice(0, 6000);
    }
  } catch (e) { console.error('[DOCX M1 mammoth]', e.message); }

  // Method 2: unzip and read word/document.xml directly
  // .docx is a zip file containing XML
  try {
    const JSZip = (await import('jszip')).default;
    const zip   = await JSZip.loadAsync(buffer);
    const xmlFile = zip.file('word/document.xml');
    if (xmlFile) {
      const xml  = await xmlFile.async('string');
      // Strip XML tags, decode entities
      const text = xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 50) {
        console.log('[DOCX] JSZip/XML extracted', text.length, 'chars');
        return text.slice(0, 6000);
      }
    }
  } catch (e) { console.error('[DOCX M2 jszip]', e.message); }

  // Method 3: raw buffer scan (last resort)
  try {
    const text = buffer.toString('utf8');
    const readable = text
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (readable.length > 100) {
      console.log('[DOCX] raw fallback extracted', readable.length, 'chars');
      return readable.slice(0, 6000);
    }
  } catch (e) { console.error('[DOCX M3 raw]', e.message); }

  return null;
}

router.post('/parse', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fname = req.file.originalname.toLowerCase();
    const isDocx = fname.endsWith('.docx') || fname.endsWith('.doc')
                || req.file.mimetype.includes('word');

    console.log('[Resume] Received:', req.file.originalname, isDocx ? 'DOCX' : 'PDF', req.file.size, 'bytes');

    const rawText = isDocx
      ? await extractDocxText(req.file.buffer)
      : await extractPdfText(req.file.buffer);

    if (!rawText) {
      return res.status(422).json({
        error: 'Could not extract text. Try saving as PDF if Word isn\'t working.',
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

Resume text:
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
Extract at least 5-8 specific technical/domain skills.`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    console.log('[Resume] Parsed:', parsed.role, '|', parsed.city, '|', (parsed.skills || []).length, 'skills');

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
