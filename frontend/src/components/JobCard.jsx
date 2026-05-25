// frontend/src/components/JobCard.jsx
import { buildLink } from '../utils/helpers.js';

const PORTAL_LABELS = { linkedin: 'LinkedIn', indeed: 'Indeed', naukri: 'Naukri' };

function companyColor(name = '') {
  const palette = [
    '#4fffb0','#00e5ff','#ff6b6b','#ffd166','#a78bfa',
    '#34d399','#f472b6','#60a5fa','#fb923c','#e879f9',
  ];
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function JobCard({ job, onDraftOutreach }) {
  const link = job.sourceUrl || buildLink(job.portal, job.title, job.company, job.city);
  const initials = (job.company || '').slice(0, 2).toUpperCase();
  const accentColor = companyColor(job.company);

  function handleOutreach(e) {
    e.preventDefault();  // don't navigate the card link
    e.stopPropagation();
    onDraftOutreach(job);
  }

  return (
    <div className={`job-card ${job.priority ? 'priority' : ''}`}>
      {job.priority && <div className="priority-bar" />}

      <div className="card-top">
        <div className="company-logo" style={{ color: accentColor, borderColor: `${accentColor}33` }}>
          {initials}
        </div>
        <div className="card-badges">
          <span className={`portal-badge portal-${job.portal}`}>{PORTAL_LABELS[job.portal]}</span>
          {job.priority && <span className="priority-badge">⭐ Priority</span>}
        </div>
      </div>

      <div className="card-body">
        <div className="job-title">{job.title}</div>
        <div className="company-name">{job.company}</div>

        {/* Salary Honesty — badge only if real numeric value exists */}
        {job.salary && (
          <div className="salary-badge">💰 {job.salary}</div>
        )}

        <div className="card-meta">
          <span className="meta-chip">📍 {job.city}</span>
          {job.experience && <span className="meta-chip">🎓 {job.experience}</span>}
        </div>
      </div>

      <div className="card-footer">
        <span className="posted-time">🕐 {job.posted}</span>
        <div className="card-actions">
          {/* Outreach button */}
          <button className="btn-outreach" onClick={handleOutreach} title="Draft a recruiter message">
            ✍️ Outreach
          </button>
          {/* Deep link apply button */}
          <a
            className="apply-link"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
          >
            Apply
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
