// backend/routes/fetchjd.js
// Fetches and extracts the real job description from the source URL.
// Used by both resume score and outreach to get actual JD text instead of guessing.

import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * POST /api/fetchjd
 * Body: { url: string, portal: 'linkedin'|'indeed'|'naukri' }
 * Returns: { jdText: string, success: boolean }
 */
router.post('/', async (req, res) => {
  const { url, portal } = req.body;

  if (!url) {
    return res.json({ jdText: '', success: false });
  }

  try {
    const { data: html } = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000,
      maxRedirects: 3,
    });

    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, nav, header, footer, iframe, .cookie-banner, [class*="cookie"], [class*="ad-"], [id*="ad-"]').remove();

    let jdText = '';

    // Portal-specific selectors — each site structures JD differently
    if (portal === 'linkedin') {
      jdText = $('.description__text, .show-more-less-html__markup, [class*="job-description"]').first().text();
    } else if (portal === 'indeed') {
      jdText = $('#jobDescriptionText, .jobsearch-jobDescriptionText, [class*="jobDescription"]').first().text();
    } else if (portal === 'naukri') {
      jdText = $('.job-desc, .dang-inner-html, [class*="job-description"], [class*="jobDescription"]').first().text();
    }

    // Generic fallback — look for largest text block that looks like a JD
    if (!jdText || jdText.trim().length < 100) {
      const candidates = [];
      $('div, section, article').each((_, el) => {
        const text = $(el).text().trim();
        // JDs are usually 200-3000 words and mention job-related terms
        if (text.length > 300 && text.length < 8000) {
          const jobTerms = ['experience', 'skills', 'responsibilities', 'requirements',
                           'qualification', 'role', 'candidate', 'job', 'work', 'team'];
          const matches = jobTerms.filter(t => text.toLowerCase().includes(t)).length;
          if (matches >= 3) candidates.push({ text, score: matches * text.length });
        }
      });
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        jdText = candidates[0].text;
      }
    }

    // Clean up whitespace and limit length
    const cleaned = jdText
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 4000);

    console.log(`[FetchJD] ✅ ${cleaned.length} chars from ${portal} — ${url.slice(0, 60)}`);

    res.json({ jdText: cleaned, success: cleaned.length > 100 });
  } catch (err) {
    console.error('[FetchJD]', err.message);
    res.json({ jdText: '', success: false });
  }
});

export default router;
