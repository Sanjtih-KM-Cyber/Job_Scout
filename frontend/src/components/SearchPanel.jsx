// frontend/src/components/SearchPanel.jsx
import { useState } from 'react';
import { ResumeUpload } from './ResumeUpload.jsx';
import { CompanyChips } from './CompanyChips.jsx';
import { scrubInput } from '../utils/helpers.js';

export function SearchPanel({ onSearch, loading, onResumeExtracted }) {
  const [role, setRole]           = useState('');
  const [city, setCity]           = useState('');
  const [experience, setExperience] = useState('');   // free number, empty = any
  const [companies, setCompanies]   = useState([]);
  const [errors, setErrors]         = useState({});

  function handleResumeExtracted(data) {
    if (data.role) setRole(data.role);
    if (data.city) setCity(data.city);
    if (data.experienceYears) setExperience(String(data.experienceYears));
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
    const expNum = parseInt(experience);
    onSearch({
      role:             role.trim(),
      city:             city.trim(),
      experience:       experienceToRange(expNum),
      experienceYears:  isNaN(expNum) ? null : expNum,
      priorityCompanies: companies,
    });
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
          <label className="field-label">
            Years of Experience
            <span className="field-hint"> (optional)</span>
          </label>
          <div className="exp-input-wrap">
            <input
              type="number"
              className="text-input exp-input"
              value={experience}
              min="0" max="50"
              onChange={e => {
                const v = e.target.value;
                if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 50)) {
                  setExperience(v);
                }
              }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. 5"
            />
            <span className="exp-unit">yrs</span>
          </div>
          {experience !== '' && (
            <span className="exp-hint">
              Searching for {experienceToLabel(parseInt(experience))} roles
            </span>
          )}
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

// Map a raw year number to the backend EXP_MAP key
function experienceToRange(yrs) {
  if (isNaN(yrs) || yrs === null) return 'any';
  if (yrs <= 1)  return 'fresher';
  if (yrs <= 3)  return '1-3';
  if (yrs <= 5)  return '3-5';
  if (yrs <= 8)  return '5-8';
  return '8+';
}

function experienceToLabel(yrs) {
  if (isNaN(yrs)) return 'any experience';
  if (yrs === 0)  return 'fresher / entry-level';
  if (yrs === 1)  return '0–1 year';
  if (yrs <= 3)   return '1–3 year';
  if (yrs <= 5)   return '3–5 year';
  if (yrs <= 8)   return '5–8 year';
  return `${yrs}+ year`;
}
