// frontend/src/hooks/useJobSearch.js
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useJobSearch() {
  const [jobs, setJobs]     = useState([]);
  const [meta, setMeta]     = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError]   = useState(null);

  const seenCompaniesRef = useRef(new Set());
  const refreshPageRef   = useRef(1); // increments on each refresh → new Adzuna page

  const search = useCallback(async ({ role, city, experience, priorityCompanies, isRefresh = false }) => {
    setStatus('loading');
    setError(null);

    // On fresh search: reset everything
    if (!isRefresh) {
      seenCompaniesRef.current = new Set();
      refreshPageRef.current   = 1;
    } else {
      // On refresh: advance Adzuna page so backend fetches a different batch
      refreshPageRef.current += 2;
    }

    const excludeCompanies = isRefresh
      ? Array.from(seenCompaniesRef.current)
      : [];

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          city,
          experience,
          priorityCompanies,
          excludeCompanies,
          refreshPage: refreshPageRef.current,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const newJobs = data.jobs || [];

      // Register all returned companies into seen registry
      newJobs.forEach(j => { if (j.company) seenCompaniesRef.current.add(j.company); });

      setJobs(newJobs);
      setMeta(data.meta || null);
      setStatus('success');
      return data;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setJobs([]);
    setMeta(null);
    setStatus('idle');
    setError(null);
    seenCompaniesRef.current = new Set();
    refreshPageRef.current   = 1;
  }, []);

  return { jobs, meta, status, error, search, reset };
}
