// frontend/src/components/OutreachModal.jsx
import { useState } from 'react';

function DataQualityBadge({ quality }) {
  if (!quality || quality === 'unknown') return null;
  const isReal = quality === 'real_jd';
  return (
    <div className={`jd-quality-badge ${isReal ? 'real' : 'inferred'}`}>
      {isReal ? '✅ Personalised using real job description' : '⚠️ Based on job title only — accuracy improves with full JD'}
    </div>
  );
}

export function OutreachModal({ job, draft, status, error, jdQuality, onClose }) {
  const [tab, setTab]     = useState('linkedin');
  const [copied, setCopied] = useState('');

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  const linkedinCharCount = draft?.linkedin?.length || 0;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal" role="dialog">
        <div className="modal-header">
          <div>
            <div className="modal-pretitle">✍️ Draft Outreach</div>
            <div className="modal-title">{job.title} at <strong>{job.company}</strong></div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {status === 'loading' && (
          <div className="modal-body modal-loading">
            <div className="outreach-spinner" />
            <p>{jdQuality === 'real_jd'
              ? 'Writing personalised messages using the real job description…'
              : 'Fetching job details and crafting your messages…'}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="modal-body modal-error">
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <p>{error || 'Could not generate draft. Try again.'}</p>
            <button className="btn-retry" onClick={onClose}>Close</button>
          </div>
        )}

        {status === 'success' && draft && (
          <>
            <div className="modal-tabs">
              <button className={`modal-tab ${tab === 'linkedin' ? 'active' : ''}`} onClick={() => setTab('linkedin')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
                LinkedIn DM
              </button>
              <button className={`modal-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Cold Email
              </button>
            </div>

            <div className="modal-body">
              <DataQualityBadge quality={jdQuality} />

              {tab === 'linkedin' && (
                <div className="draft-section">
                  <div className="draft-meta">
                    <span className="draft-label">LinkedIn Connection Note</span>
                    <span className={`char-count ${linkedinCharCount > 300 ? 'over' : ''}`}>
                      {linkedinCharCount}/300
                    </span>
                  </div>
                  <div className="draft-box">{draft.linkedin}</div>
                  <div className="draft-actions">
                    <div className="draft-tip">Send this as your LinkedIn connection request note.</div>
                    <button className={`btn-copy ${copied === 'linkedin' ? 'copied' : ''}`} onClick={() => copy(draft.linkedin, 'linkedin')}>
                      {copied === 'linkedin' ? '✅ Copied!' : 'Copy Note'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'email' && (
                <div className="draft-section">
                  <div className="draft-subject-wrap">
                    <span className="subject-label">Subject:</span>
                    <div className="draft-subject">{draft.email.subject}</div>
                    <button className={`btn-copy-small ${copied === 'subject' ? 'copied' : ''}`} onClick={() => copy(draft.email.subject, 'subject')}>
                      {copied === 'subject' ? '✅' : 'Copy'}
                    </button>
                  </div>
                  <div className="draft-box">{draft.email.body}</div>
                  <div className="draft-actions">
                    <div className="draft-tip">Find the recruiter on LinkedIn and send via InMail or direct email.</div>
                    <button className={`btn-copy ${copied === 'email' ? 'copied' : ''}`} onClick={() => copy(draft.email.body, 'email')}>
                      {copied === 'email' ? '✅ Copied!' : 'Copy Email'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
