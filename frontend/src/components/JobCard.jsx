// frontend/src/components/JobCard.jsx
import { buildLink } from '../utils/helpers.js';

const PORTAL_LABELS = { linkedin: 'LinkedIn', indeed: 'Indeed', naukri: 'Naukri' };

function companyColor(name = '') {
  const palette = ['#4fffb0','#00e5ff','#ff6b6b','#ffd166','#a78bfa','#34d399','#f472b6','#60a5fa','#fb923c','#e879f9'];
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function JobCard({ job, onDraftOutreach, onAnalyze, onWhatsApp }) {
  const link        = job.sourceUrl || buildLink(job.portal, job.title, job.company, job.city);
  const initials    = (job.company || '').slice(0, 2).toUpperCase();
  const accentColor = companyColor(job.company);
  const match       = job.matchResult;

  function stop(e) { e.preventDefault(); e.stopPropagation(); }

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

        {/* Match badge — only when resume uploaded (matchResult not null) */}
        {match && (
          <div className="match-badge" title={`${match.matchedSkills?.join(', ') || 'Role alignment'}`}>
            <div className="match-bar">
              <div className="match-fill" style={{ width: `${match.score}%`, background: match.color }} />
            </div>
            <span className="match-label" style={{ color: match.color }}>
              {match.score}% · {match.label}
            </span>
          </div>
        )}

        {job.salary && <div className="salary-badge">💰 {job.salary}</div>}

        <div className="card-meta">
          <span className="meta-chip">📍 {job.city}</span>
          {job.experience && <span className="meta-chip">🎓 {job.experience}</span>}
          {match?.matchedSkills?.slice(0, 2).map(s => (
            <span key={s} className="meta-chip skill-chip">✓ {s}</span>
          ))}
        </div>
      </div>

      <div className="card-footer">
        <span className="posted-time">🕐 {job.posted}</span>
        <div className="card-actions">
          {/* JD Summary */}
          <button className="btn-card-action" onClick={e => { stop(e); onAnalyze(job, 'summary'); }} title="Summarise JD">📋</button>
          {/* Resume Score */}
          <button className="btn-card-action" onClick={e => { stop(e); onAnalyze(job, 'score'); }} title="Score my resume">📊</button>
          {/* WhatsApp Share */}
          <button className="btn-card-action btn-wa" onClick={e => { stop(e); onWhatsApp(job); }} title="Share on WhatsApp">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.523 5.84L0 24l6.341-1.489A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 01-5.031-1.373l-.361-.214-3.741.979 1.003-3.653-.235-.374A9.857 9.857 0 012.118 12C2.118 6.539 6.539 2.118 12 2.118c5.46 0 9.882 4.421 9.882 9.882 0 5.46-4.422 9.882-9.882 9.882z"/>
            </svg>
          </button>
          {/* Outreach */}
          <button className="btn-outreach" onClick={e => { stop(e); onDraftOutreach(job); }} title="Draft outreach">✍️ Outreach</button>
          {/* Apply */}
          <a className="apply-link" href={link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
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
