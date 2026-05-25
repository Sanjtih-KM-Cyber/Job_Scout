// frontend/src/components/FilterBar.jsx
const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'priority', label: '⭐ Priority first' },
  { id: 'salary',   label: '💰 Has salary' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'indeed',   label: 'Indeed' },
  { id: 'naukri',   label: 'Naukri' },
];

export function FilterBar({ active, onChange, total, cached }) {
  return (
    <div className="filter-bar">
      <div className="filter-left">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${active === f.id ? 'active' : ''}`}
            onClick={() => onChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="filter-right">
        {cached && <span className="cached-badge">⚡ Cached</span>}
        <div className="live-badge">
          <span className="pulse-dot" />
          {total} live results
        </div>
      </div>
    </div>
  );
}
