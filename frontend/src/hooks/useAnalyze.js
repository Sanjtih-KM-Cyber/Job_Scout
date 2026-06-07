// frontend/src/hooks/useAnalyze.js
// Fetches real JD text first, then sends to analyze API for accurate scoring.

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

export function useAnalyze() {
  const [analyzeJob,    setAnalyzeJob]    = useState(null);
  const [activeTab,     setActiveTab]     = useState('score');
  const [scoreData,     setScoreData]     = useState(null);
  const [summaryData,   setSummaryData]   = useState(null);
  const [scoreStatus,   setScoreStatus]   = useState('idle');
  const [summaryStatus, setSummaryStatus] = useState('idle');
  const [jdQuality,     setJdQuality]     = useState('unknown'); // 'real_jd' | 'inferred' | 'title_only'

  const openAnalyze = useCallback(async (job, resume, tab = 'score') => {
    setAnalyzeJob(job);
    setActiveTab(tab);
    setScoreData(null);
    setSummaryData(null);
    setScoreStatus('idle');
    setSummaryStatus('idle');
    setJdQuality('unknown');

    // Step 1: Fetch real JD text (silently, in background)
    // This is the key improvement — both features get real requirements
    const jdText = await fetchJD(job);
    const quality = jdText.length > 100 ? 'real_jd' : 'title_only';
    setJdQuality(quality);

    console.log(`[Analyze] JD fetch: ${jdText.length} chars (${quality})`);

    // Step 2: Fire both analyses in parallel with real JD
    const fetchScore = async () => {
      if (!resume?.role) { setScoreStatus('no-resume'); return; }
      setScoreStatus('loading');
      try {
        const res  = await fetch(`${API_BASE}/analyze/resume-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job, resume, jdText }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setScoreData(data);
        setScoreStatus('success');
      } catch { setScoreStatus('error'); }
    };

    const fetchSummary = async () => {
      setSummaryStatus('loading');
      try {
        const res  = await fetch(`${API_BASE}/analyze/summarize-jd`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job, jdText }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSummaryData(data);
        setSummaryStatus('success');
      } catch { setSummaryStatus('error'); }
    };

    await Promise.all([fetchScore(), fetchSummary()]);
  }, []);

  const closeAnalyze = useCallback(() => {
    setAnalyzeJob(null);
    setScoreData(null);
    setSummaryData(null);
    setScoreStatus('idle');
    setSummaryStatus('idle');
    setJdQuality('unknown');
  }, []);

  return {
    analyzeJob, activeTab, setActiveTab,
    scoreData, summaryData,
    scoreStatus, summaryStatus,
    jdQuality,
    openAnalyze, closeAnalyze,
  };
}
