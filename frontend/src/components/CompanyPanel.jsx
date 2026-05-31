// frontend/src/components/CompanyPanel.jsx
// Company Intelligence Mode search panel
import { useState } from 'react';
import { scrubInput } from '../utils/helpers.js';

// Suggested sectors shown as quick-tap chips below the sector input
const SECTOR_SUGGESTIONS = [
  'Finance','Engineering','Data Science','Product','Design',
  'Marketing','HR','Sales','Operations','Legal','DevOps','Security',
];

export function CompanyPanel({ onSearch, loading }) {
  const [company, setCompany] = useState('');
  const [sector,  setSector]  = useState('');
  const [city,    setCity]    = useState('');
  const [errors,  setErrors]  = useState({});

  function validate() {
    const e = {};
    if (!company.trim()) e.company = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSearch() {
    if (!validate()) return;
    onSearch({ company: company.trim(), sector: sector.trim(), city: city.trim() });
  }

  return (
    <div className="search-panel">
      {/* Header */}
      <div className="company-panel-header">
        <div className="company-panel-icon">🏢</div>
        <div>
          <div className="company-panel-title">Company Intelligence Mode</div>
          <div className="company-panel-sub">
            Enter a company and sector to see all their open roles in that domain
          </div>
        </div>
      </div>

      <div className="search-grid">
        <div className="input-group" style={{ gridColumn: 'span 2' }}>
          <label className="field-label">Company Name</label>
          <input
            type="text"
            className={`text-input ${errors.company ? 'input-error' : ''}`}
            value={company}
            onChange={e => { setCompany(scrubInput(e.target.value)); setErrors({}); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Infosys, Google, Razorpay, HDFC Bank…"
          />
          {errors.company && <span className="error-hint">Enter a company name</span>}
        </div>

        <div className="input-group">
          <label className="field-label">
            Sector / Domain
            <span className="field-hint"> (optional)</span>
          </label>
          <input
            type="text"
            className="text-input"
            value={sector}
            onChange={e => setSector(scrubInput(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Finance, Engineering, Data Science…"
          />
        </div>
      </div>

      {/* Sector quick suggestions */}
      <div className="sector-suggestions">
        {SECTOR_SUGGESTIONS.map(s => (
          <button
            key={s}
            className={`sector-chip ${sector === s ? 'active' : ''}`}
            onClick={() => setSector(prev => prev === s ? '' : s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* City + search button */}
      <div className="company-panel-footer">
        <div className="input-group" style={{ flex: 1 }}>
          <label className="field-label">City <span className="field-hint">(optional)</span></label>
          <input
            type="text"
            className="text-input"
            value={city}
            onChange={e => setCity(scrubInput(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Bangalore, Mumbai… (blank = all India)"
          />
        </div>
        <button
          className={`btn-search ${loading ? 'loading' : ''}`}
          style={{ marginTop: 22 }}
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <><span className="spinner" /> Scanning…</>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Find Roles
            </>
          )}
        </button>
      </div>
    </div>
  );
}
