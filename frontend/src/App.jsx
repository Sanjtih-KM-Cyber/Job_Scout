import { useState, useRef } from 'react';
import { Header }           from './components/Header.jsx';
import { SearchPanel }      from './components/SearchPanel.jsx';
import { FilterBar }        from './components/FilterBar.jsx';
import { JobGrid }          from './components/JobGrid.jsx';
import { SavedSearches }    from './components/SavedSearches.jsx';
import { OutreachModal }    from './components/OutreachModal.jsx';
import { useTheme }         from './hooks/useTheme.js';
import { useJobSearch }     from './hooks/useJobSearch.js';
import { useSavedSearches } from './hooks/useSavedSearches.js';
import { useOutreach }      from './hooks/useOutreach.js';

export default function App() {
  const { theme, toggle: toggleTheme }               = useTheme();
  const { jobs, meta, status, error, search }        = useJobSearch();
  const { saved, saveSearch, removeSearch, clearAll }= useSavedSearches();
  const { outreachJob, outreachDraft, outreachStatus, outreachError, openOutreach, closeOutreach } = useOutreach();

  const [filter, setFilter]             = useState('all');
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [lastParams, setLastParams]     = useState(null);
  const [justSaved, setJustSaved]       = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Resume data — stored so JobGrid can score jobs against it
  const resumeDataRef = useRef(null);

  async function handleSearch(params, isRefresh = false) {
    setLastParams(params);
    if (!isRefresh) setFilter('all');
    await search({ ...params, isRefresh });
  }

  async function handleRefresh() {
    if (!lastParams || status === 'loading') return;
    setIsRefreshing(true);
    await handleSearch(lastParams, true);
    setIsRefreshing(false);
  }

  function handleLoadSaved(s) {
    const params = {
      role: s.role, city: s.city,
      experience: s.experience,
      priorityCompanies: s.priorityCompanies || [],
    };
    setDrawerOpen(false);
    handleSearch(params);
  }

  function handleSave() {
    if (!lastParams) return;
    saveSearch(lastParams);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  function handleResumeExtracted(data) {
    resumeDataRef.current = data;
  }

  const showResults = status === 'loading' || status === 'success' || status === 'error';

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        savedCount={saved.length}
        onOpenSaved={() => setDrawerOpen(true)}
      />

      <main className="main">
        <div className="hero">
          <h1>The job market,<br /><em>unfiltered.</em></h1>
          <p>Real-time discovery across LinkedIn, Indeed &amp; Naukri. No ads, no stale data, no ghost links.</p>
        </div>

        <div className="search-wrap">
          <SearchPanel
            onSearch={handleSearch}
            loading={status === 'loading'}
            onResumeExtracted={handleResumeExtracted}
          />
        </div>

        {showResults && (
          <div className="results-wrap">
            <div className="results-header">
              {meta && (
                <div className="results-title">
                  <strong>{meta.role}</strong> in {meta.city}
                  {meta.experience && meta.experience !== 'any' && (
                    <span className="results-exp"> · {meta.experience}</span>
                  )}
                </div>
              )}
              <div className="results-actions">
                {status === 'success' && (
                  <div className="integrity-badge">{jobs.length} real results</div>
                )}
                {status === 'success' && lastParams && (
                  <button
                    className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
                    onClick={handleRefresh}
                    disabled={isRefreshing || status === 'loading'}
                    title="Fetch a fresh batch of jobs"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Refresh Listings
                  </button>
                )}
                <button
                  className={`btn-save-search ${justSaved ? 'saved' : ''}`}
                  onClick={handleSave}
                >
                  {justSaved ? '✅ Saved!' : '🔖 Save Search'}
                </button>
              </div>
            </div>

            <FilterBar
              active={filter}
              onChange={setFilter}
              total={jobs.length}
              cached={meta?.cached}
            />

            <JobGrid
              jobs={jobs}
              status={status}
              filter={filter}
              resume={resumeDataRef.current}
              onDraftOutreach={job => openOutreach(job, resumeDataRef.current)}
            />
          </div>
        )}

        {status === 'idle' && (
          <div className="empty-state">
            <div className="empty-icon">🔭</div>
            <h3>Ready to scan the market</h3>
            <p>Enter a role and city above — or drop your resume for instant auto-fill + qualification matching</p>
          </div>
        )}
      </main>

      {drawerOpen && (
        <SavedSearches
          saved={saved}
          onLoad={handleLoadSaved}
          onRemove={removeSearch}
          onClearAll={clearAll}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {outreachJob && (
        <OutreachModal
          job={outreachJob}
          draft={outreachDraft}
          status={outreachStatus}
          error={outreachError}
          onClose={closeOutreach}
        />
      )}
    </div>
  );
}
