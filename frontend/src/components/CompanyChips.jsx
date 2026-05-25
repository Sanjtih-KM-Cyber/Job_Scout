// frontend/src/components/CompanyChips.jsx
import { useState } from 'react';

export function CompanyChips({ companies, onChange }) {
  const [input, setInput] = useState('');

  function add() {
    const val = input.trim().replace(/[^a-zA-Z0-9 '.&-]/g, '');
    if (!val || companies.includes(val)) { setInput(''); return; }
    onChange([...companies, val]);
    setInput('');
  }

  function remove(name) {
    onChange(companies.filter(c => c !== name));
  }

  return (
    <div className="chips-section">
      <label className="field-label">
        🎯 Target Companies
        <span className="field-hint"> — pinned at top (optional)</span>
      </label>
      <div className="chips-input-row">
        <input
          type="text"
          className="text-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Google, Razorpay, Flipkart…"
        />
        <button className="btn-add" onClick={add}>+ Add</button>
      </div>
      {companies.length > 0 && (
        <div className="chips-row">
          {companies.map(name => (
            <div key={name} className="chip">
              <span className="chip-priority">Priority</span>
              {name}
              <button
                className="chip-remove"
                onClick={() => remove(name)}
                aria-label={`Remove ${name}`}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
