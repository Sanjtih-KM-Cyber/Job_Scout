// frontend/src/components/WhatsAppShare.jsx
import { useState, useEffect } from 'react';

const STORAGE_KEY  = 'jobscout:whatsapp-numbers';
const APP_URL      = 'job-scout-seven.vercel.app'; // ← update to your actual Vercel URL

function loadNumbers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveNumbers(nums) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nums));
}

export function WhatsAppShare({ job, onClose }) {
  const [numbers, setNumbers] = useState(loadNumbers);
  const [input,   setInput]   = useState('');
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  useEffect(() => { saveNumbers(numbers); }, [numbers]);

  const jobUrl  = job.sourceUrl || buildFallbackLink(job);

  // Plain text message — no markdown, emojis as actual Unicode characters
  const messageText =
    `Hey! Found a job that might interest you:\n\n` +
    `\uD83D\uDCBC ${job.title} at ${job.company}\n` +
    `\uD83D\uDCCD ${job.city || 'India'}\n` +
    (job.salary ? `\uD83D\uDCB0 ${job.salary}\n` : '') +
    `\n\uD83D\uDD17 Apply here: ${jobUrl}\n\n` +
    `Found on JobScout AI \u2192 ${APP_URL}`;

  const encodedMsg = encodeURIComponent(messageText);

  function waLink(number) {
    return `https://api.whatsapp.com/send?phone=${number}&text=${encodedMsg}`;
  }

  function cleanNumber(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    return digits;
  }

  function formatDisplay(num) {
    if (num.startsWith('91') && num.length === 12) {
      return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
    }
    return `+${num}`;
  }

  function addNumber() {
    const clean = cleanNumber(input.trim());
    if (clean.length < 10) { setError('Enter a valid 10-digit mobile number'); return; }
    if (numbers.length >= 5) { setError('Maximum 5 contacts allowed'); return; }
    if (numbers.includes(clean)) { setError('This number is already added'); return; }
    setNumbers(prev => [...prev, clean]);
    setInput(''); setError('');
  }

  function removeNumber(i) {
    setNumbers(prev => prev.filter((_, idx) => idx !== i));
  }

  function startEdit(i) { setEditing(i); setEditVal(numbers[i]); }

  function saveEdit(i) {
    const clean = cleanNumber(editVal.trim());
    if (clean.length < 10) { setError('Invalid number'); return; }
    setNumbers(prev => prev.map((n, idx) => idx === i ? clean : n));
    setEditing(null); setEditVal(''); setError('');
  }

  function copyMessage() {
    navigator.clipboard.writeText(messageText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Open WhatsApp Web once — user stays logged in across all sends
  // Uses api.whatsapp.com (not wa.me) which reuses existing WA Web session
  function openForNumber(number) {
    window.open(waLink(number), '_blank', 'noopener');
  }

  function openAll() {
    // Open first immediately, rest with delay so browser doesn't block popups
    numbers.forEach((num, i) => {
      setTimeout(() => {
        window.open(waLink(num), '_blank', 'noopener');
      }, i * 1000);
    });
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal whatsapp-modal" role="dialog">
        <div className="modal-header">
          <div>
            <div className="modal-pretitle" style={{ color: '#25D366' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366" style={{marginRight:5,verticalAlign:'middle'}}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.523 5.84L0 24l6.341-1.489A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 01-5.031-1.373l-.361-.214-3.741.979 1.003-3.653-.235-.374A9.857 9.857 0 012.118 12C2.118 6.539 6.539 2.118 12 2.118c5.46 0 9.882 4.421 9.882 9.882 0 5.46-4.422 9.882-9.882 9.882z"/>
              </svg>
              WhatsApp Share
            </div>
            <div className="modal-title">
              {job.title} at <strong>{job.company}</strong>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Message preview */}
          <div className="wa-preview">
            <div className="wa-preview-label">Message preview</div>
            <div className="wa-preview-box">
              💼 {job.title} at {job.company}<br />
              📍 {job.city || 'India'}{job.salary ? ` · 💰 ${job.salary}` : ''}<br />
              🔗 Apply link + JobScout AI link included
            </div>
            <button
              className={`btn-copy-msg ${copied ? 'copied' : ''}`}
              onClick={copyMessage}
            >
              {copied ? '✅ Copied!' : '📋 Copy message text'}
            </button>
          </div>

          {/* Tip */}
          <div className="wa-tip">
            💡 <strong>Tip:</strong> WhatsApp Web stays logged in after the first open — subsequent contacts open instantly in the same session.
          </div>

          {/* Add number */}
          <div className="wa-add-row">
            <input
              type="tel"
              className="text-input"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && addNumber()}
              placeholder="10-digit mobile number"
              maxLength={13}
            />
            <button className="btn-add" onClick={addNumber} disabled={numbers.length >= 5}>
              + Add
            </button>
          </div>
          {error && <div className="wa-error">{error}</div>}
          <div className="wa-limit-hint">{numbers.length}/5 contacts saved</div>

          {/* Numbers list */}
          {numbers.length > 0 && (
            <ul className="wa-numbers">
              {numbers.map((num, i) => (
                <li key={num} className="wa-number-row">
                  {editing === i ? (
                    <div className="wa-edit-row">
                      <input type="tel" className="text-input" value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(i)} autoFocus />
                      <button className="btn-add" onClick={() => saveEdit(i)}>Save</button>
                      <button className="wa-cancel" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className="wa-number-display">{formatDisplay(num)}</span>
                      <div className="wa-actions">
                        <button className="wa-edit" onClick={() => startEdit(i)} title="Edit">✏️</button>
                        <button className="wa-remove" onClick={() => removeNumber(i)} title="Remove">✕</button>
                        <button className="wa-send-btn" onClick={() => openForNumber(num)}>
                          Send
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {numbers.length > 1 && (
            <button className="btn-wa-all" onClick={openAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.523 5.84L0 24l6.341-1.489A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 01-5.031-1.373l-.361-.214-3.741.979 1.003-3.653-.235-.374A9.857 9.857 0 012.118 12C2.118 6.539 6.539 2.118 12 2.118c5.46 0 9.882 4.421 9.882 9.882 0 5.46-4.422 9.882-9.882 9.882z"/>
              </svg>
              Send to all {numbers.length} contacts
            </button>
          )}

          {numbers.length === 0 && (
            <div className="wa-empty">
              Add up to 5 contacts above.<br />
              Numbers are remembered for next time.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function buildFallbackLink(job) {
  const q = encodeURIComponent(`${job.title} ${job.company}`);
  const l = encodeURIComponent(job.city || 'India');
  return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;
}
