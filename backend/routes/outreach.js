// backend/routes/outreach.js
// Generates Cold DM (LinkedIn) + Cold Email using Groq
// Better, more human-sounding copy

import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/draft', async (req, res, next) => {
  try {
    const { job, resume } = req.body;

    if (!job?.title || !job?.company) {
      return res.status(400).json({ error: 'job.title and job.company are required' });
    }

    const candidateSummary = resume?.role
      ? `Candidate:
- Role: ${resume.role}
- Experience: ${resume.experienceYears || 'Not specified'} years
- Skills: ${(resume.skills || []).slice(0, 6).join(', ') || 'Not specified'}
- Location: ${resume.city || 'India'}
- Summary: ${resume.summary || 'Not provided'}`
      : 'Candidate profile not provided — write a confident, compelling generic message.';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.75,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: `You write outreach messages for Indian job seekers. Your style is:
- Warm and direct — like a smart friend reaching out, not a desperate applicant
- Specific — always mention the exact role and a concrete skill match
- Confident but not arrogant
- No filler phrases like "I hope this finds you well", "I am writing to express my interest", "I would love to connect"
- No emojis
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Write two outreach messages.

${candidateSummary}

Job:
- Role: ${job.title}
- Company: ${job.company}
- Location: ${job.city || 'India'}
- Platform: ${job.portal || 'LinkedIn'}
${job.salary ? `- Salary: ${job.salary}` : ''}
${job.experience ? `- Experience needed: ${job.experience}` : ''}

Guidelines:
LinkedIn DM: Under 300 characters. Start with something specific about the role or company. End with a clear, easy ask (a quick call, a reply). Do NOT start with "Hi" or "Hello" alone.
Cold Email: 3-4 sentences. First sentence = hook (specific insight about the company or role). Second = your most relevant credential. Third = specific ask. Sign off naturally.

Return this JSON:
{
  "linkedin": "LinkedIn DM under 300 chars",
  "email": {
    "subject": "Specific subject — not generic like 'Job Application'",
    "body": "3-4 sentence email body"
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
        subject: parsed.email?.subject || `Re: ${job.title} at ${job.company}`,
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
