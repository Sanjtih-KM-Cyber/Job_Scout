// backend/routes/analyze.js
// Two features powered by Groq:
//   POST /api/analyze/resume-score  — score resume against a specific job
//   POST /api/analyze/summarize-jd  — summarize a job description into 5 bullets

import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Feature 4: Resume Score Against Job ──────────────────────────────────────
// Compares resume profile against job card details.
// Returns: score, matched requirements, missing skills, verdict.
//
// POST /api/analyze/resume-score
// Body: { job, resume }
router.post('/resume-score', async (req, res, next) => {
  try {
    const { job, resume } = req.body;

    if (!job?.title || !job?.company) {
      return res.status(400).json({ error: 'job.title and job.company are required' });
    }
    if (!resume?.role) {
      return res.status(400).json({ error: 'Upload your resume first to use this feature' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: 'You are a senior technical recruiter at a top Indian tech company. Evaluate resumes against job requirements precisely. Return ONLY valid JSON — no markdown, no explanation.',
        },
        {
          role: 'user',
          content: `Evaluate this candidate's fit for the job.

CANDIDATE PROFILE:
- Current/target role: ${resume.role}
- Years of experience: ${resume.experienceYears || 'Not specified'}
- Skills: ${(resume.skills || []).join(', ') || 'Not specified'}
- Location: ${resume.city || 'India'}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.city || 'India'}
- Portal: ${job.portal}
${job.experience ? `- Experience required: ${job.experience}` : ''}
${job.salary ? `- Salary: ${job.salary}` : ''}

Return this exact JSON:
{
  "score": 72,
  "verdict": "one sentence honest verdict about fit",
  "matched": ["requirement 1 they meet", "requirement 2 they meet"],
  "missing": ["skill/requirement they lack", "another gap"],
  "suggestion": "one specific actionable tip to improve their chances for this role"
}

Rules:
- score is 0-100 integer
- matched: list 3-5 specific things from their profile that fit this role
- missing: list 2-4 honest gaps — be specific, not generic
- if candidate is clearly overqualified, say so in verdict and reflect in score (70-80)
- if candidate is clearly underqualified, score below 40`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({
      score:      Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
      verdict:    parsed.verdict    || '',
      matched:    parsed.matched    || [],
      missing:    parsed.missing    || [],
      suggestion: parsed.suggestion || '',
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI response could not be parsed. Try again.' });
    }
    next(err);
  }
});

// ── Feature 8: Job Description Summariser ────────────────────────────────────
// Strips corporate fluff, extracts what actually matters.
// Returns: required skills, nice to have, responsibilities, red flags, verdict.
//
// POST /api/analyze/summarize-jd
// Body: { job }
router.post('/summarize-jd', async (req, res, next) => {
  try {
    const { job } = req.body;

    if (!job?.title || !job?.company) {
      return res.status(400).json({ error: 'job details are required' });
    }

    // We don't have the raw JD text from scrapers (they don't fetch full descriptions)
    // so we ask Groq to reason about what this role typically requires at this type of company
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'You are an expert job market analyst for the Indian tech industry. Return ONLY valid JSON — no markdown, no preamble.',
        },
        {
          role: 'user',
          content: `Summarise what this job likely involves based on the role title and company.

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.city || 'India'}
${job.experience ? `- Experience: ${job.experience}` : ''}
${job.salary     ? `- Salary: ${job.salary}` : ''}
- Found on: ${job.portal}

Return this exact JSON (be specific to this role and company type, not generic):
{
  "required": ["must-have skill 1", "must-have skill 2", "must-have skill 3"],
  "niceToHave": ["bonus skill 1", "bonus skill 2"],
  "responsibilities": ["actual day-to-day task 1", "task 2", "task 3"],
  "redFlags": ["potential concern 1 if any — or empty array if none"],
  "tldr": "one punchy sentence — what this job actually is in plain English"
}

Rules:
- required: 3-5 items, specific to this role and company level
- niceToHave: 2-3 items
- responsibilities: 3-4 concrete day-to-day tasks, not corporate fluff
- redFlags: honest concerns — demanding experience for low salary, vague title, etc. Empty array if genuinely fine.
- tldr: brutally honest one-liner, max 15 words`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({
      required:        parsed.required        || [],
      niceToHave:      parsed.niceToHave      || [],
      responsibilities:parsed.responsibilities || [],
      redFlags:        parsed.redFlags        || [],
      tldr:            parsed.tldr            || '',
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI response could not be parsed. Try again.' });
    }
    next(err);
  }
});

export default router;
