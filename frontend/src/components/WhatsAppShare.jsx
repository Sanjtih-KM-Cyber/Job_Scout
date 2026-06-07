// frontend/src/components/WhatsAppShare.jsx
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jobscout:whatsapp-numbers';
const APP_URL     = 'https://job-scout-seven.vercel.app';

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

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
  const [sentIdx, setSentIdx] = useState([]);
  const [sending, setSending] = useState(false);

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
  const mobile = isMobile();

  function waUrl(number) {
    return mobile
      ? `whatsapp://send?phone=${number}&text=${encodedMsg}`
      : `https://web.whatsapp.com/send?phone=${number}&text=${encodedMsg}`;
  }

  // ── Single send ────────────────────────────────────────────────────────────
  function sendOne(number, idx) {
    if (mobile) {
      window.location.href = waUrl(number);
    } else {
      // Desktop: open in named tab so it reuses the same tab
      window.open(waUrl(number), 'jobscout_wa');
    }
    setSentIdx(prev => [...new Set([...prev, idx])]);
  }

  // ── Send All fix ───────────────────────────────────────────────────────────
  // Bug was: on mobile window.location.href navigates away immediately,
  // so setTimeout for subsequent contacts never fires.
  // Fix: on mobile open each in a new tab (user taps back between them)
  //      on desktop open each in a new named tab sequentially
  async function sendAll() {
    if (sending) return;
    setSending(true);

    if (mobile) {
      // On mobile: open each contact in a new tab
      // User sees all WA chats open and can send from each
      numbers.forEach((num, i) => {
        window.open(waUrl(num), `_blank`);
      });
      setSentIdx(numbers.map((_, i) => i));
    } else {
      // On desktop: open first immediately, then navigate same tab after delay
      // so user can actually send the message before next one loads
      for (let i = 0; i < numbers.length; i++) {
        const num = numbers[i];
        if (i === 0) {
          window.open(waUrl(num), 'jobscout_wa');
        } else {
          // Wait 4 seconds between each so user has time to send
          await new Promise(r => setTimeout(r, 4000));
          const existingTab = window.open('', 'jobscout_wa');
          if (existingTab) {
            existingTab.location.href = waUrl(num);
            existingTab.focus();
          } else {
            window.open(waUrl(num), 'jobscout_wa');
          }
        }
        setSentIdx(prev => [...new Set([...prev, i])]);
      }
    }

    setSending(false);
  }

  function cleanNumber(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    return digits;
  }

  function formatDisplay(num) {
    if (num.startsWith('91') && num.length === 12) return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
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
    setSentIdx(prev => prev.filter(s => s !== i));
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

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal whatsapp-modal" role="dialog">
        <div className="modal-header">
          <div>
            <div className="modal-pretitle" style={{ color: '#25D366' }}>📲 WhatsApp Share</div>
            <div className="modal-title">{job.title} at <strong>{job.company}</strong></div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="wa-preview">
            <div className="wa-preview-label">Message preview</div>
            <div className="wa-preview-box" style={{ whiteSpace: 'pre-line' }}>{messageText}</div>
            <button className={`btn-copy-msg ${copied ? 'copied' : ''}`} onClick={copyMessage}>
              {copied ? '✅ Copied!' : '📋 Copy message'}
            </button>
          </div>

          <div className="wa-tip">
            {mobile
              ? '📱 Opens WhatsApp app directly. Send All opens each contact in a new tab.'
              : '🖥️ Opens WhatsApp Web. Send All cycles through contacts with a 4s gap to let you send.'}
          </div>

          <div className="wa-add-row">
            <input type="tel" className="text-input" value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && addNumber()}
              placeholder="10-digit mobile number" maxLength={13} />
            <button className="btn-add" onClick={addNumber} disabled={numbers.length >= 5}>+ Add</button>
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
                        <button className="wa-edit" onClick={() => startEdit(i)}>✏️</button>
                        <button className="wa-remove" onClick={() => removeNumber(i)}>✕</button>
                        <button
                          className={`wa-send-btn ${sentIdx.includes(i) ? 'sent' : ''}`}
                          onClick={() => sendOne(num, i)}
                        >
                          {sentIdx.includes(i) ? '✅ Sent' : 'Send'}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {numbers.length > 1 && (
            <button className="btn-wa-all" onClick={sendAll} disabled={sending}>
              {sending ? '⏳ Sending…' : `📲 Send to all ${numbers.length} contacts`}
            </button>
          )}

          {numbers.length === 0 && (
            <div className="wa-empty">Add up to 5 contacts above.<br />Numbers are remembered for next time.</div>
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
