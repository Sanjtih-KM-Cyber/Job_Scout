// frontend/src/components/SavedSearches.jsx
const EXP_LABELS = {
  any: 'Any exp', fresher: 'Fresher', '1-3': '1–3 yrs',
  '3-5': '3–5 yrs', '5-8': '5–8 yrs', '8+': '8+ yrs',
};

export function SavedSearches({ saved, onLoad, onRemove, onClearAll, onClose }) {
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Saved searches">
        <div className="drawer-header">
          <h2 className="drawer-title">Saved Searches</h2>
          <div className="drawer-header-actions">
            {saved.length > 0 && (
              <button className="btn-clear" onClick={onClearAll}>Clear all</button>
            )}
            <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {saved.length === 0 ? (
          <div className="drawer-empty">
            <div style={{ fontSize: '2rem', opacity: 0.3 }}>🔖</div>
            <p>No saved searches yet.</p>
            <p style={{ fontSize: '0.85rem' }}>Run a search, then click "Save Search" to bookmark it here.</p>
          </div>
        ) : (
          <ul className="saved-list">
            {saved.map(s => (
              <li key={s.id} className="saved-item">
                <div className="saved-item-main" onClick={() => { onLoad(s); onClose(); }}>
                  <div className="saved-role">{s.role}</div>
                  <div className="saved-meta">
                    📍 {s.city}
                    {s.experience !== 'any' && <> · 🎓 {EXP_LABELS[s.experience]}</>}
                    {s.priorityCompanies?.length > 0 && (
                      <> · ⭐ {s.priorityCompanies.join(', ')}</>
                    )}
                  </div>
                  <div className="saved-date">Saved {formatDate(s.savedAt)}</div>
                </div>
                <button
                  className="saved-remove"
                  onClick={() => onRemove(s.id)}
                  aria-label="Remove saved search"
                >✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
