// frontend/src/hooks/useJobSearch.js
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useJobSearch() {
  const [jobs, setJobs]     = useState([]);
  const [meta, setMeta]     = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError]   = useState(null);

  const seenCompaniesRef = useRef(new Set());
  const refreshPageRef   = useRef(1);
  const lastRoleRef      = useRef('');  // track last searched role
  const lastCityRef      = useRef('');  // track last searched city

  const search = useCallback(async ({ role, city, experience, priorityCompanies, isRefresh = false }) => {
    setStatus('loading');
    setError(null);

    // ── Detect if the user changed their search ───────────────────────
    // If role or city changed, this is a brand new search — wipe everything
    const roleChanged = role?.toLowerCase().trim() !== lastRoleRef.current;
    const cityChanged = city?.toLowerCase().trim() !== lastCityRef.current;
    const isNewSearch = !isRefresh || roleChanged || cityChanged;

    if (isNewSearch) {
      // Full reset — new search must NEVER show old results
      seenCompaniesRef.current = new Set();
      refreshPageRef.current   = 1;
      lastRoleRef.current      = role?.toLowerCase().trim() || '';
      lastCityRef.current      = city?.toLowerCase().trim() || '';
    } else {
      // Genuine refresh of same search — advance page for fresh batch
      refreshPageRef.current += 2;
    }

    const excludeCompanies = isRefresh && !isNewSearch
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

      // Register returned companies into seen registry
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
    setJobs([]); setMeta(null);
    setStatus('idle'); setError(null);
    seenCompaniesRef.current = new Set();
    refreshPageRef.current   = 1;
    lastRoleRef.current      = '';
    lastCityRef.current      = '';
  }, []);

  return { jobs, meta, status, error, search, reset };
}
