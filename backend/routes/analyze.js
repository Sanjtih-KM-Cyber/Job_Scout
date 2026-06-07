// backend/routes/analyze.js
// Feature 4: Resume Score — now uses real JD text
// Feature 8: JD Summary — now uses real JD text

import { Router } from 'express';
import Groq from 'groq-sdk';

const router  = Router();
const groq    = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Resume Score ──────────────────────────────────────────────────────────────
router.post('/resume-score', async (req, res, next) => {
  try {
    const { job, resume, jdText } = req.body;

    if (!job?.title || !job?.company) {
      return res.status(400).json({ error: 'job.title and job.company are required' });
    }
    if (!resume?.role) {
      return res.status(400).json({ error: 'Upload your resume first to use this feature' });
    }

    // Use real JD if available, otherwise fall back to title-based analysis
    const jobContext = jdText && jdText.length > 100
      ? `Full Job Description:\n${jdText}`
      : `Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.city || 'India'}${job.experience ? `\nExperience: ${job.experience}` : ''}${job.salary ? `\nSalary: ${job.salary}` : ''}`;

    const hasRealJD = jdText && jdText.length > 100;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: `You are a senior technical recruiter. Evaluate candidate fit with brutal honesty.
${hasRealJD ? 'You have the actual job description — use it for precise matching.' : 'You only have the job title — give a general assessment.'}
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Evaluate this candidate's fit.

CANDIDATE:
- Role: ${resume.role}
- Experience: ${resume.experienceYears || 'Not specified'} years
- Skills: ${(resume.skills || []).join(', ') || 'Not specified'}
- Location: ${resume.city || 'India'}
${resume.summary ? `- Summary: ${resume.summary}` : ''}

${jobContext}

Return this exact JSON:
{
  "score": 72,
  "verdict": "honest one-sentence verdict",
  "matched": ["specific thing they have that matches", "another match"],
  "missing": ["specific gap 1", "specific gap 2"],
  "suggestion": "one specific actionable tip to improve chances for this exact role",
  "dataQuality": "${hasRealJD ? 'real_jd' : 'title_only'}"
}

Rules:
- score: 0-100 integer. Be realistic — 90+ is rare, 60-75 is a good match.
- matched: 3-5 specific matches from their profile to this role's needs
- missing: 2-4 honest gaps — name specific skills/experience they lack
- if candidate is very underqualified: score < 40, say so clearly
- if candidate is overqualified: score 65-75, mention it in verdict`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({
      score:       Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
      verdict:     parsed.verdict      || '',
      matched:     parsed.matched      || [],
      missing:     parsed.missing      || [],
      suggestion:  parsed.suggestion   || '',
      dataQuality: parsed.dataQuality  || 'title_only',
    });
  } catch (err) {
    if (err instanceof SyntaxError) return res.status(422).json({ error: 'AI response could not be parsed. Try again.' });
    next(err);
  }
});

// ── JD Summary ────────────────────────────────────────────────────────────────
router.post('/summarize-jd', async (req, res, next) => {
  try {
    const { job, jdText } = req.body;

    if (!job?.title || !job?.company) {
      return res.status(400).json({ error: 'job details are required' });
    }

    const hasRealJD = jdText && jdText.length > 100;

    const jobContext = hasRealJD
      ? `Full Job Description:\n${jdText}`
      : `Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.city || 'India'}${job.experience ? `\nExperience: ${job.experience}` : ''}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `You are a job market analyst. Cut through corporate jargon.
${hasRealJD ? 'You have the real JD — extract facts from it directly.' : 'You only have the title — make educated inferences based on the role and company type.'}
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Summarise this job.

${jobContext}

Return this exact JSON:
{
  "required": ["must-have skill/experience 1", "must-have 2", "must-have 3"],
  "niceToHave": ["bonus 1", "bonus 2"],
  "responsibilities": ["actual day-to-day task 1", "task 2", "task 3"],
  "redFlags": ["concern 1 if any"],
  "tldr": "what this job actually is in plain English — max 15 words",
  "dataQuality": "${hasRealJD ? 'real_jd' : 'inferred'}"
}

Rules:
- Be specific — name actual tools, frameworks, domains (not generic "communication skills")
- responsibilities: real tasks, not corporate fluff like "drive synergies"
- redFlags: be honest — vague title, low salary for high requirements, contract vs permanent ambiguity. Empty array if genuinely fine.
- tldr: brutally honest, conversational`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({
      required:         parsed.required         || [],
      niceToHave:       parsed.niceToHave       || [],
      responsibilities: parsed.responsibilities  || [],
      redFlags:         parsed.redFlags         || [],
      tldr:             parsed.tldr             || '',
      dataQuality:      parsed.dataQuality      || 'inferred',
    });
  } catch (err) {
    if (err instanceof SyntaxError) return res.status(422).json({ error: 'AI response could not be parsed. Try again.' });
    next(err);
  }
});

export default router;
