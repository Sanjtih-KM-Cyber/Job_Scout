// frontend/src/hooks/useOutreach.js
// Fetches real JD text first, then generates accurate outreach messages.

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchJD(job) {
  if (!job?.sourceUrl) return '';
  try {
    const res  = await fetch(`${API_BASE}/fetchjd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: job.sourceUrl, portal: job.portal }),
    });
    const data = await res.json();
    return data.jdText || '';
  } catch {
    return '';
  }
}

export function useOutreach() {
  const [outreachJob,    setOutreachJob]    = useState(null);
  const [outreachDraft,  setOutreachDraft]  = useState(null);
  const [outreachStatus, setOutreachStatus] = useState('idle');
  const [outreachError,  setOutreachError]  = useState(null);
  const [jdQuality,      setJdQuality]      = useState('unknown');

  const openOutreach = useCallback(async (job, resume) => {
    setOutreachJob(job);
    setOutreachDraft(null);
    setOutreachStatus('loading');
    setOutreachError(null);
    setJdQuality('unknown');

    // Fetch real JD first for accurate outreach
    const jdText = await fetchJD(job);
    const quality = jdText.length > 100 ? 'real_jd' : 'title_only';
    setJdQuality(quality);

    console.log(`[Outreach] JD fetch: ${jdText.length} chars (${quality})`);

    try {
      const res = await fetch(`${API_BASE}/outreach/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, resume, jdText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setOutreachDraft(data);
      setOutreachStatus('success');
    } catch (err) {
      setOutreachError(err.message);
      setOutreachStatus('error');
    }
  }, []);

  const closeOutreach = useCallback(() => {
    setOutreachJob(null);
    setOutreachDraft(null);
    setOutreachStatus('idle');
    setOutreachError(null);
    setJdQuality('unknown');
  }, []);

  return {
    outreachJob, outreachDraft, outreachStatus, outreachError,
    jdQuality,
    openOutreach, closeOutreach,
  };
}
