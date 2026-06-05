// frontend/src/components/WhatsAppShare.jsx
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jobscout:whatsapp-numbers';
const APP_URL     = 'https://jobscout-ai.vercel.app';

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

  const jobUrl = job.sourceUrl || buildFallbackLink(job);

  const salary = job.salary ? `💰 ${job.salary}\n` : '';
  const messageText = [
    `Hey! Found a job that might interest you:`,
    ``,
    `💼 ${job.title} at ${job.company}`,
    `📍 ${job.city || 'India'}`,
    salary.trim(),
    ``,
    `🔗 Apply here: ${jobUrl}`,
    ``,
    `Found on JobScout AI → ${APP_URL}`,
  ].join('\n').replace(/\n{3,}/g, '\n\n');

  const encodedMsg = encodeURIComponent(messageText);

  // ── KEY CHANGE: web.whatsapp.com instead of api.whatsapp.com ──────────
  // web.whatsapp.com opens directly in browser — no "Open app?" prompt ever.
  // User must be logged into WhatsApp Web once (stays logged in permanently).
  function waWebLink(number) {
    return `https://web.whatsapp.com/send?phone=${number}&text=${encodedMsg}`;
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

  function openForNumber(number) {
    window.open(waWebLink(number), 'whatsapp_web', 'noopener');
  }

  function openAll() {
    numbers.forEach((num, i) => {
      setTimeout(() => window.open(waWebLink(num), 'whatsapp_web_' + i, 'noopener'), i * 900);
    });
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal whatsapp-modal" role="dialog">
        <div className="modal-header">
          <div>
            <div className="modal-pretitle" style={{ color: '#25D366' }}>📲 WhatsApp Share</div>
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
            <div className="wa-preview-box" style={{ whiteSpace: 'pre-line' }}>
              {messageText}
            </div>
            <button className={`btn-copy-msg ${copied ? 'copied' : ''}`} onClick={copyMessage}>
              {copied ? '✅ Copied!' : '📋 Copy message'}
            </button>
          </div>

          {/* WhatsApp Web tip */}
          <div className="wa-tip">
            🌐 Opens in <strong>WhatsApp Web</strong> — no desktop app, no prompts.
            Log in to <a href="https://web.whatsapp.com" target="_blank" rel="noopener" style={{color:'#25D366'}}>web.whatsapp.com</a> once and it stays logged in.
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
                        <button className="wa-edit"   onClick={() => startEdit(i)}    title="Edit">✏️</button>
                        <button className="wa-remove" onClick={() => removeNumber(i)} title="Remove">✕</button>
                        <button className="wa-send-btn" onClick={() => openForNumber(num)}>Send</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {numbers.length > 1 && (
            <button className="btn-wa-all" onClick={openAll}>
              📲 Send to all {numbers.length} contacts
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
