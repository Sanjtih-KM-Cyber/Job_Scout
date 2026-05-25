// backend/routes/outreach.js
// AI provider: Groq (llama-3.3-70b-versatile)
// Context-Aware Recruiter Outreach Drafts
// Combines resume profile + job card → LinkedIn note + cold email

import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * POST /api/outreach/draft
 * Body: { job, resume }
 * Returns: { linkedin, email: { subject, body } }
 */
router.post('/draft', async (req, res, next) => {
  try {
    const { job, resume } = req.body;

    if (!job?.title || !job?.company) {
      return res.status(400).json({ error: 'job.title and job.company are required' });
    }

    const candidateSummary = resume
      ? `Candidate:
- Role: ${resume.role || 'Not specified'}
- Experience: ${resume.experienceYears || 'Not specified'} years
- Skills: ${(resume.skills || []).join(', ') || 'Not specified'}
- Location: ${resume.city || 'India'}`
      : 'Candidate background not provided — write a strong generic template.';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'You are a career coach writing outreach messages for Indian tech job seekers. Return ONLY valid JSON — no markdown, no preamble.',
        },
        {
          role: 'user',
          content: `${candidateSummary}

Target job:
- Role: ${job.title}
- Company: ${job.company}
- Location: ${job.city || 'India'}
- Platform: ${job.portal || 'LinkedIn'}
${job.salary     ? `- Salary: ${job.salary}` : ''}
${job.experience ? `- Experience required: ${job.experience}` : ''}

Write two outreach messages. Be specific, confident, human — never generic or sycophantic.
LinkedIn note MUST be under 300 characters. Email: 4-5 tight sentences.

Return this exact JSON:
{
  "linkedin": "LinkedIn connection note under 300 chars, direct and punchy, no emojis",
  "email": {
    "subject": "Specific email subject line",
    "body": "4-5 sentence email body highlighting 2-3 specific skill matches with a clear ask at the end"
  }
}`,
        },
      ],
    });

    const text   = completion.choices[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.json({
      linkedin: parsed.linkedin || '',
      email: {
        subject: parsed.email?.subject || `Interest in ${job.title} at ${job.company}`,
        body:    parsed.email?.body    || '',
      },
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI response could not be parsed. Try again.' });
    }
    next(err);
  }
});

export default router;
