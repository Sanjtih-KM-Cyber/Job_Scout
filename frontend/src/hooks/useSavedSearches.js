// frontend/src/hooks/useSavedSearches.js
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'jobscout:saved';
const MAX_SAVED = 10;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(searches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
}

export function useSavedSearches() {
  const [saved, setSaved] = useState(load);

  const saveSearch = useCallback((params) => {
    setSaved(prev => {
      // Deduplicate by role+city+experience
      const key = `${params.role}:${params.city}:${params.experience}`;
      const exists = prev.find(s => `${s.role}:${s.city}:${s.experience}` === key);
      if (exists) return prev;

      const entry = {
        id: Date.now(),
        ...params,
        savedAt: new Date().toISOString(),
      };
      const next = [entry, ...prev].slice(0, MAX_SAVED);
      save(next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((id) => {
    setSaved(prev => {
      const next = prev.filter(s => s.id !== id);
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSaved([]);
  }, []);

  return { saved, saveSearch, removeSearch, clearAll };
}
