// frontend/src/hooks/useViewedJobs.js
// Tracks which jobs the user has already opened/viewed.
// Persists in localStorage — survives refresh, new searches, everything.
// Keyed by "title:company" fingerprint — no IDs needed.

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'jobscout:viewed';
const MAX_VIEWED  = 500; // cap so localStorage doesn't grow forever

function load() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function save(set) {
  const arr = Array.from(set).slice(-MAX_VIEWED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function fingerprint(job) {
  return `${(job.title || '').toLowerCase().trim()}:${(job.company || '').toLowerCase().trim()}`;
}

export function useViewedJobs() {
  const [viewed, setViewed] = useState(load);

  const markViewed = useCallback((job) => {
    const key = fingerprint(job);
    setViewed(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      save(next);
      return next;
    });
  }, []);

  const isViewed = useCallback((job) => {
    return viewed.has(fingerprint(job));
  }, [viewed]);

  const clearViewed = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setViewed(new Set());
  }, []);

  return { isViewed, markViewed, clearViewed, viewedCount: viewed.size };
}
