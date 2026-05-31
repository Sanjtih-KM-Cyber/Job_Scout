// frontend/src/hooks/useAnalyze.js
import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useAnalyze() {
  const [analyzeJob,    setAnalyzeJob]    = useState(null);
  const [activeTab,     setActiveTab]     = useState('score'); // 'score' | 'summary'
  const [scoreData,     setScoreData]     = useState(null);
  const [summaryData,   setSummaryData]   = useState(null);
  const [scoreStatus,   setScoreStatus]   = useState('idle');
  const [summaryStatus, setSummaryStatus] = useState('idle');

  const openAnalyze = useCallback(async (job, resume, tab = 'score') => {
    setAnalyzeJob(job);
    setActiveTab(tab);
    setScoreData(null);
    setSummaryData(null);
    setScoreStatus('idle');
    setSummaryStatus('idle');

    // Fire both requests in parallel — user sees whichever tab they clicked faster
    const fetchScore = async () => {
      if (!resume?.role) {
        setScoreStatus('no-resume');
        return;
      }
      setScoreStatus('loading');
      try {
        const res  = await fetch(`${API_BASE}/analyze/resume-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job, resume }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setScoreData(data);
        setScoreStatus('success');
      } catch (err) {
        setScoreStatus('error');
      }
    };

    const fetchSummary = async () => {
      setSummaryStatus('loading');
      try {
        const res  = await fetch(`${API_BASE}/analyze/summarize-jd`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSummaryData(data);
        setSummaryStatus('success');
      } catch (err) {
        setSummaryStatus('error');
      }
    };

    // Fire both in parallel
    Promise.all([fetchScore(), fetchSummary()]);
  }, []);

  const closeAnalyze = useCallback(() => {
    setAnalyzeJob(null);
    setScoreData(null);
    setSummaryData(null);
    setScoreStatus('idle');
    setSummaryStatus('idle');
  }, []);

  return {
    analyzeJob, activeTab, setActiveTab,
    scoreData, summaryData,
    scoreStatus, summaryStatus,
    openAnalyze, closeAnalyze,
  };
}
