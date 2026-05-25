// frontend/src/components/Header.jsx
import { ThemeToggle } from './ThemeToggle.jsx';

export function Header({ theme, onToggleTheme, savedCount, onOpenSaved }) {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-mark">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.9"/>
            <circle cx="8" cy="2.5" r="1.5" fill="currentColor"/>
            <circle cx="13" cy="11" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="11" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <span>Job<em>Scout</em> AI</span>
      </div>

      <div className="header-right">
        <button className="saved-btn" onClick={onOpenSaved} aria-label="Saved searches">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Saved
          {savedCount > 0 && <span className="saved-count">{savedCount}</span>}
        </button>

        <div className="header-badge">Live Mirror</div>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
