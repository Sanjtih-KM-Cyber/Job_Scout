// frontend/src/hooks/useOutreach.js
import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useOutreach() {
  const [outreachJob, setOutreachJob]       = useState(null);  // job currently being drafted
  const [outreachDraft, setOutreachDraft]   = useState(null);  // { linkedin, email }
  const [outreachStatus, setOutreachStatus] = useState('idle'); // idle|loading|success|error
  const [outreachError, setOutreachError]   = useState(null);

  // Open the modal and fire the AI draft generation
  const openOutreach = useCallback(async (job, resume) => {
    setOutreachJob(job);
    setOutreachDraft(null);
    setOutreachStatus('loading');
    setOutreachError(null);

    try {
      const res = await fetch(`${API_BASE}/outreach/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, resume }),
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
  }, []);

  return { outreachJob, outreachDraft, outreachStatus, outreachError, openOutreach, closeOutreach };
}
