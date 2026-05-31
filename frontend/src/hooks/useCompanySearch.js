// frontend/src/hooks/useCompanySearch.js
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useCompanySearch() {
  const [jobs, setJobs]     = useState([]);
  const [meta, setMeta]     = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError]   = useState(null);

  const refreshPageRef      = useRef(1);
  const lastCompanyRef      = useRef('');
  const lastSectorRef       = useRef('');

  const search = useCallback(async ({ company, sector, city, isRefresh = false }) => {
    setStatus('loading');
    setError(null);

    // Detect if company or sector changed — treat as fresh search
    const companyChanged = company?.toLowerCase().trim() !== lastCompanyRef.current;
    const sectorChanged  = sector?.toLowerCase().trim()  !== lastSectorRef.current;
    const isNewSearch    = !isRefresh || companyChanged || sectorChanged;

    if (isNewSearch) {
      refreshPageRef.current  = 1;
      lastCompanyRef.current  = company?.toLowerCase().trim() || '';
      lastSectorRef.current   = sector?.toLowerCase().trim()  || '';
    } else {
      // Genuine refresh — next page
      refreshPageRef.current += 2;
    }

    try {
      const res = await fetch(`${API_BASE}/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          sector,
          city,
          refreshPage: refreshPageRef.current,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setJobs(data.jobs || []);
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
    refreshPageRef.current  = 1;
    lastCompanyRef.current  = '';
    lastSectorRef.current   = '';
  }, []);

  return { jobs, meta, status, error, search, reset };
}
