// backend/routes/outreach.js
// Context-aware outreach — now uses real JD text for accuracy

import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/draft', async (req, res, next) => {
  try {
    const { job, resume, jdText } = req.body;

    if (!job?.title || !job?.company) {
      return res.status(400).json({ error: 'job.title and job.company are required' });
    }

    const hasRealJD  = jdText && jdText.length > 100;
    const hasResume  = resume?.role;

    const candidateSummary = hasResume
      ? `Candidate:
- Role: ${resume.role}
- Experience: ${resume.experienceYears || 'Not specified'} years
- Skills: ${(resume.skills || []).slice(0, 8).join(', ') || 'Not specified'}
- Location: ${resume.city || 'India'}
${resume.summary ? `- Background: ${resume.summary}` : ''}`
      : `Candidate: Profile not uploaded — write confident, compelling generic messages.`;

    const jobContext = hasRealJD
      ? `Job Description (real, extracted from source):\n${jdText.slice(0, 2000)}`
      : `Job: ${job.title} at ${job.company}${job.city ? `, ${job.city}` : ''}${job.experience ? ` · ${job.experience}` : ''}${job.salary ? ` · ${job.salary}` : ''}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.75,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: `You write outreach messages for Indian job seekers. Rules:
- Warm and direct — like a smart colleague reaching out, not a desperate applicant
- ${hasRealJD ? 'Use specific details from the real JD — mention actual requirements they meet' : 'Be specific about the role and company type'}
- ${hasResume ? 'Reference the candidate\'s actual skills and background' : 'Write a strong generic message'}
- No filler: never say "I hope this finds you well", "I am writing to express", "I would love to connect"
- No emojis in the messages
- LinkedIn DM: under 300 chars, specific, direct ask
- Email: 3-4 sentences — hook, credential, ask
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Write outreach messages.

${candidateSummary}

${jobContext}

${hasRealJD ? 'Use specific requirements from the JD to show precise fit.' : ''}

Return this JSON:
{
  "linkedin": "LinkedIn DM under 300 chars — specific, no fluff, clear ask at end",
  "email": {
    "subject": "Specific subject line — not generic",
    "body": "3-4 sentences: hook about role/company, your most relevant credential matching their need, clear ask"
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
    if (err instanceof SyntaxError) return res.status(422).json({ error: 'AI response could not be parsed. Try again.' });
    next(err);
  }
});

export default router;
