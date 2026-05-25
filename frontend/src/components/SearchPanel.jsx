// frontend/src/components/SearchPanel.jsx
import { useState } from 'react';
import { ResumeUpload } from './ResumeUpload.jsx';
import { CompanyChips } from './CompanyChips.jsx';
import { scrubInput } from '../utils/helpers.js';

const EXPERIENCE_OPTIONS = [
  { value: 'any',     label: 'Any experience' },
  { value: 'fresher', label: 'Fresher (0–1 yr)' },
  { value: '1-3',     label: '1–3 years' },
  { value: '3-5',     label: '3–5 years' },
  { value: '5-8',     label: '5–8 years' },
  { value: '8+',      label: '8+ years' },
];

export function SearchPanel({ onSearch, loading, onResumeExtracted }) {
  const [role, setRole]         = useState('');
  const [city, setCity]         = useState('');
  const [experience, setExperience] = useState('any');
  const [companies, setCompanies]   = useState([]);
  const [errors, setErrors]         = useState({});

  function handleResumeExtracted(data) {
    if (data.role)               setRole(data.role);
    if (data.city)               setCity(data.city);
    if (data.suggestedExperience) setExperience(data.suggestedExperience);
    onResumeExtracted?.(data);
  }

  function validate() {
    const e = {};
    if (!role.trim()) e.role = true;
    if (!city.trim()) e.city = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSearch() {
    if (!validate()) return;
    onSearch({ role: role.trim(), city: city.trim(), experience, priorityCompanies: companies });
  }

  return (
    <div className="search-panel">
      <ResumeUpload onExtracted={handleResumeExtracted} />

      <div className="search-grid">
        <div className="input-group">
          <label className="field-label">Role / Title</label>
          <input
            type="text"
            className={`text-input ${errors.role ? 'input-error' : ''}`}
            value={role}
            onChange={e => { setRole(scrubInput(e.target.value)); setErrors(p => ({...p, role: false})); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="SDE, Product Manager, UX Designer…"
          />
          {errors.role && <span className="error-hint">Enter a role</span>}
        </div>

        <div className="input-group">
          <label className="field-label">City</label>
          <input
            type="text"
            className={`text-input ${errors.city ? 'input-error' : ''}`}
            value={city}
            onChange={e => { setCity(scrubInput(e.target.value)); setErrors(p => ({...p, city: false})); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Bangalore, Mumbai, Hyderabad…"
          />
          {errors.city && <span className="error-hint">Enter a city</span>}
        </div>

        <div className="input-group">
          <label className="field-label">Experience</label>
          <select
            className="text-input select-input"
            value={experience}
            onChange={e => setExperience(e.target.value)}
          >
            {EXPERIENCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <CompanyChips companies={companies} onChange={setCompanies} />

      <div className="search-footer">
        <div className="portals-hint">
          <span className="portal-dot linkedin">●</span> LinkedIn &nbsp;
          <span className="portal-dot indeed">●</span> Indeed &nbsp;
          <span className="portal-dot naukri">●</span> Naukri
        </div>
        <button
          className={`btn-search ${loading ? 'loading' : ''}`}
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
              Discover Jobs
            </>
          )}
        </button>
      </div>
    </div>
  );
}
