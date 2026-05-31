// frontend/src/components/AnalyzeModal.jsx
// Combined modal for Feature 4 (Resume Score) + Feature 8 (JD Summary)

export function AnalyzeModal({
  job, activeTab, onTabChange,
  scoreData, summaryData,
  scoreStatus, summaryStatus,
  onClose,
}) {
  function scoreColor(n) {
    if (n >= 75) return '#4fffb0';
    if (n >= 50) return '#00e5ff';
    if (n >= 35) return '#ffd166';
    return '#ff6b6b';
  }

  function scoreLabel(n) {
    if (n >= 75) return 'Strong fit';
    if (n >= 50) return 'Good fit';
    if (n >= 35) return 'Partial fit';
    return 'Weak fit';
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal analyze-modal" role="dialog">

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-pretitle">🔍 Job Analysis</div>
            <div className="modal-title">
              {job.title} at <strong>{job.company}</strong>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'score' ? 'active' : ''}`}
            onClick={() => onTabChange('score')}
          >
            📊 Resume Score
          </button>
          <button
            className={`modal-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => onTabChange('summary')}
          >
            📋 JD Summary
          </button>
        </div>

        {/* ── Resume Score Tab ── */}
        {activeTab === 'score' && (
          <div className="modal-body">
            {scoreStatus === 'no-resume' && (
              <div className="analyze-empty">
                <div style={{ fontSize: '2.5rem' }}>📄</div>
                <h3>Upload your resume first</h3>
                <p>Go back and drop your PDF resume in the search panel. Once uploaded, this shows how well you match this specific role.</p>
              </div>
            )}

            {scoreStatus === 'loading' && (
              <div className="analyze-loading">
                <div className="outreach-spinner" />
                <p>Comparing your profile against this role…</p>
              </div>
            )}

            {scoreStatus === 'error' && (
              <div className="analyze-empty">
                <div style={{ fontSize: '2rem' }}>⚠️</div>
                <p>Could not generate score. Try again.</p>
              </div>
            )}

            {scoreStatus === 'success' && scoreData && (
              <div className="score-content">
                {/* Big score circle */}
                <div className="score-hero">
                  <div className="score-circle" style={{ '--score-color': scoreColor(scoreData.score) }}>
                    <svg viewBox="0 0 120 120" className="score-ring">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border2)" strokeWidth="8"/>
                      <circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke={scoreColor(scoreData.score)} strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(scoreData.score / 100) * 327} 327`}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                      />
                    </svg>
                    <div className="score-number" style={{ color: scoreColor(scoreData.score) }}>
                      {scoreData.score}
                    </div>
                    <div className="score-pct">/ 100</div>
                  </div>
                  <div className="score-meta">
                    <div className="score-label" style={{ color: scoreColor(scoreData.score) }}>
                      {scoreLabel(scoreData.score)}
                    </div>
                    <div className="score-verdict">{scoreData.verdict}</div>
                  </div>
                </div>

                {/* Matched */}
                {scoreData.matched?.length > 0 && (
                  <div className="score-section">
                    <div className="score-section-title">✅ What you bring</div>
                    <ul className="score-list matched-list">
                      {scoreData.matched.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}

                {/* Missing */}
                {scoreData.missing?.length > 0 && (
                  <div className="score-section">
                    <div className="score-section-title">⚠️ Gaps to address</div>
                    <ul className="score-list missing-list">
                      {scoreData.missing.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}

                {/* Suggestion */}
                {scoreData.suggestion && (
                  <div className="score-suggestion">
                    💡 <strong>Pro tip:</strong> {scoreData.suggestion}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── JD Summary Tab ── */}
        {activeTab === 'summary' && (
          <div className="modal-body">
            {summaryStatus === 'loading' && (
              <div className="analyze-loading">
                <div className="outreach-spinner" />
                <p>Cutting through the corporate fluff…</p>
              </div>
            )}

            {summaryStatus === 'error' && (
              <div className="analyze-empty">
                <div style={{ fontSize: '2rem' }}>⚠️</div>
                <p>Could not summarise. Try again.</p>
              </div>
            )}

            {summaryStatus === 'success' && summaryData && (
              <div className="summary-content">
                {/* TL;DR */}
                {summaryData.tldr && (
                  <div className="summary-tldr">
                    <span className="tldr-label">TL;DR</span>
                    {summaryData.tldr}
                  </div>
                )}

                <div className="summary-grid">
                  {/* Required */}
                  {summaryData.required?.length > 0 && (
                    <div className="summary-block">
                      <div className="summary-block-title required-title">🔴 Must Have</div>
                      <ul className="summary-list">
                        {summaryData.required.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Nice to have */}
                  {summaryData.niceToHave?.length > 0 && (
                    <div className="summary-block">
                      <div className="summary-block-title nicetohave-title">🟡 Nice to Have</div>
                      <ul className="summary-list">
                        {summaryData.niceToHave.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Responsibilities */}
                {summaryData.responsibilities?.length > 0 && (
                  <div className="summary-block">
                    <div className="summary-block-title">📌 What you'll actually do</div>
                    <ul className="summary-list">
                      {summaryData.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {/* Red flags */}
                {summaryData.redFlags?.length > 0 && (
                  <div className="summary-block">
                    <div className="summary-block-title redflag-title">🚩 Watch out for</div>
                    <ul className="summary-list redflag-list">
                      {summaryData.redFlags.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
