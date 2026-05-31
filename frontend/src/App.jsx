import { useState, useRef } from 'react';
import { Header }           from './components/Header.jsx';
import { ModeToggle }       from './components/ModeToggle.jsx';
import { SearchPanel }      from './components/SearchPanel.jsx';
import { CompanyPanel }     from './components/CompanyPanel.jsx';
import { FilterBar }        from './components/FilterBar.jsx';
import { JobGrid }          from './components/JobGrid.jsx';
import { SavedSearches }    from './components/SavedSearches.jsx';
import { OutreachModal }    from './components/OutreachModal.jsx';
import { AnalyzeModal }     from './components/AnalyzeModal.jsx';
import { useTheme }         from './hooks/useTheme.js';
import { useJobSearch }     from './hooks/useJobSearch.js';
import { useCompanySearch } from './hooks/useCompanySearch.js';
import { useSavedSearches } from './hooks/useSavedSearches.js';
import { useOutreach }      from './hooks/useOutreach.js';
import { useAnalyze }       from './hooks/useAnalyze.js';

export default function App() {
  const { theme, toggle: toggleTheme }                = useTheme();
  const roleSearch    = useJobSearch();
  const companySearch = useCompanySearch();
  const { saved, saveSearch, removeSearch, clearAll } = useSavedSearches();
  const { outreachJob, outreachDraft, outreachStatus, outreachError, openOutreach, closeOutreach } = useOutreach();
  const {
    analyzeJob, activeTab, setActiveTab,
    scoreData, summaryData, scoreStatus, summaryStatus,
    openAnalyze, closeAnalyze,
  } = useAnalyze();

  const [mode, setMode]             = useState('role');
  const [filter, setFilter]         = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastParams, setLastParams] = useState(null);
  const [justSaved, setJustSaved]   = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const resumeDataRef = useRef(null);

  const active = mode === 'role' ? roleSearch : companySearch;
  const { jobs, meta, status } = active;

  function handleModeChange(newMode) {
    setMode(newMode);
    setFilter('all');
    setLastParams(null);
    roleSearch.reset?.();
    companySearch.reset?.();
  }

  async function handleRoleSearch(params, isRefresh = false) {
    setLastParams({ ...params, mode: 'role' });
    if (!isRefresh) setFilter('all');
    await roleSearch.search({ ...params, isRefresh });
  }

  async function handleCompanySearch(params, isRefresh = false) {
    setLastParams({ ...params, mode: 'company' });
    if (!isRefresh) setFilter('all');
    await companySearch.search({ ...params, isRefresh });
  }

  async function handleRefresh() {
    if (!lastParams || status === 'loading') return;
    setIsRefreshing(true);
    if (lastParams.mode === 'company') await handleCompanySearch(lastParams, true);
    else await handleRoleSearch(lastParams, true);
    setIsRefreshing(false);
  }

  function handleLoadSaved(s) {
    setDrawerOpen(false);
    if (s.mode === 'company') { setMode('company'); handleCompanySearch(s); }
    else { setMode('role'); handleRoleSearch(s); }
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

  function handleAnalyze(job, tab) {
    openAnalyze(job, resumeDataRef.current, tab);
  }

  const showResults = status === 'loading' || status === 'success' || status === 'error';

  function resultsLabel() {
    if (!meta) return null;
    if (meta.mode === 'company') {
      return <><strong>{meta.company}</strong>{meta.sector && ` · ${meta.sector}`}{meta.city && ` in ${meta.city}`}</>;
    }
    return (
      <><strong>{meta.role}</strong> in {meta.city}
        {meta.experience && meta.experience !== 'any' && <span className="results-exp"> · {meta.experience}</span>}
      </>
    );
  }

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
          <p>Real-time discovery across LinkedIn, Indeed &amp; Naukri. No ads, no stale data.</p>
        </div>

        <div className="search-wrap">
          <ModeToggle mode={mode} onChange={handleModeChange} />
          {mode === 'role' ? (
            <SearchPanel
              onSearch={handleRoleSearch}
              loading={status === 'loading' && mode === 'role'}
              onResumeExtracted={handleResumeExtracted}
            />
          ) : (
            <CompanyPanel
              onSearch={handleCompanySearch}
              loading={status === 'loading' && mode === 'company'}
            />
          )}
        </div>

        {showResults && (
          <div className="results-wrap">
            <div className="results-header">
              <div className="results-title">{resultsLabel()}</div>
              <div className="results-actions">
                {status === 'success' && (
                  <div className="integrity-badge">{jobs.length} real results</div>
                )}
                {status === 'success' && lastParams && (
                  <button
                    className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
                    onClick={handleRefresh}
                    disabled={isRefreshing || status === 'loading'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Refresh Listings
                  </button>
                )}
                <button className={`btn-save-search ${justSaved ? 'saved' : ''}`} onClick={handleSave}>
                  {justSaved ? '✅ Saved!' : '🔖 Save Search'}
                </button>
              </div>
            </div>

            <FilterBar active={filter} onChange={setFilter} total={jobs.length} cached={meta?.cached} />

            <JobGrid
              jobs={jobs}
              status={status}
              filter={filter}
              resume={mode === 'role' ? resumeDataRef.current : null}
              onDraftOutreach={job => openOutreach(job, resumeDataRef.current)}
              onAnalyze={handleAnalyze}
            />
          </div>
        )}

        {status === 'idle' && (
          <div className="empty-state">
            <div className="empty-icon">{mode === 'company' ? '🏢' : '🔭'}</div>
            <h3>{mode === 'company' ? 'Company Intelligence ready' : 'Ready to scan the market'}</h3>
            <p>{mode === 'company'
              ? 'Enter a company and sector to see all their open roles'
              : 'Enter a role and city — or drop your resume for instant auto-fill'}</p>
          </div>
        )}
      </main>

      {drawerOpen && (
        <SavedSearches
          saved={saved} onLoad={handleLoadSaved}
          onRemove={removeSearch} onClearAll={clearAll}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {outreachJob && (
        <OutreachModal
          job={outreachJob} draft={outreachDraft}
          status={outreachStatus} error={outreachError}
          onClose={closeOutreach}
        />
      )}

      {analyzeJob && (
        <AnalyzeModal
          job={analyzeJob}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          scoreData={scoreData}
          summaryData={summaryData}
          scoreStatus={scoreStatus}
          summaryStatus={summaryStatus}
          onClose={closeAnalyze}
        />
      )}
    </div>
  );
}
