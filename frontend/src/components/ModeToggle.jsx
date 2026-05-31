// frontend/src/components/ModeToggle.jsx
// Switches between Role-First mode and Company Intelligence mode

export function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${mode === 'role' ? 'active' : ''}`}
        onClick={() => onChange('role')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Role Search
      </button>
      <button
        className={`mode-btn ${mode === 'company' ? 'active' : ''}`}
        onClick={() => onChange('company')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
        Company Intel
      </button>
    </div>
  );
}
