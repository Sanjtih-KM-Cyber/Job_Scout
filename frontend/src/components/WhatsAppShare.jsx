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
  const [numbers,      setNumbers]      = useState(loadNumbers);
  const [input,        setInput]        = useState('');
  const [editing,      setEditing]      = useState(null);
  const [editVal,      setEditVal]      = useState('');
  const [error,        setError]        = useState('');
  const [copied,       setCopied]       = useState(false);
  const [sentIdx,      setSentIdx]      = useState([]);
  // Mobile: queue mode — shows which contact to send to next
  const [mobileQueue,  setMobileQueue]  = useState(null); // null | number index

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
    if (mobile) {
      // Deep link opens WhatsApp app directly on phone
      return `whatsapp://send?phone=${number}&text=${encodedMsg}`;
    }
    // Desktop: wa.me opens in WhatsApp Web, unique tab per contact
    return `https://wa.me/${number}?text=${encodedMsg}`;
  }

  // ── Desktop: open each contact in its own uniquely named tab ────────────
  function sendOneDesktop(number, idx) {
    window.open(waUrl(number), `wa_${number}`);
    setSentIdx(prev => [...new Set([...prev, idx])]);
  }

  function sendAllDesktop() {
    numbers.forEach((num, i) => {
      setTimeout(() => {
        window.open(waUrl(num), `wa_${num}`);
        setSentIdx(prev => [...new Set([...prev, i])]);
      }, i * 400);
    });
  }

  // ── Mobile: queue-based sending ─────────────────────────────────────────
  // window.open is blocked on mobile. Instead we show a "Send to X → Next"
  // flow. User taps Send, WA app opens, they come back, tap Next contact.
  function startMobileQueue() {
    // Find first unsent contact
    const firstUnsent = numbers.findIndex((_, i) => !sentIdx.includes(i));
    if (firstUnsent !== -1) setMobileQueue(firstUnsent);
  }

  function sendMobileCurrent() {
    if (mobileQueue === null) return;
    const number = numbers[mobileQueue];
    window.location.href = waUrl(number);
    setSentIdx(prev => [...new Set([...prev, mobileQueue])]);

    // Find next unsent
    const nextUnsent = numbers.findIndex((_, i) => i > mobileQueue && !sentIdx.includes(i));
    setMobileQueue(nextUnsent !== -1 ? nextUnsent : null);
  }

  // ── Unified handlers ─────────────────────────────────────────────────────
  function sendOne(number, idx) {
    if (mobile) {
      window.location.href = waUrl(number);
      setSentIdx(prev => [...new Set([...prev, idx])]);
    } else {
      sendOneDesktop(number, idx);
    }
  }

  function sendAll() {
    if (mobile) {
      startMobileQueue();
    } else {
      sendAllDesktop();
    }
  }

  function cleanNumber(raw) {
    const digits = raw.replace(/\D/g, '');
    // Already full international format with 91
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    // 10-digit Indian mobile number
    if (digits.length === 10) return `91${digits}`;
    // With leading 0
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    // With +91 already giving 13 chars like 919...
    if (digits.length === 13 && digits.startsWith('91')) return digits.slice(0, 12);
    // Fallback — return as is but only if looks valid
    if (digits.length >= 10) return digits.slice(-12);
    return digits;
  }

  function formatDisplay(num) {
    const digits = (num || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return `+${digits}`;
  }

  function addNumber() {
    const clean = cleanNumber(input.trim());
    if (clean.length < 10) { setError('Enter a valid 10-digit number'); return; }
    if (numbers.length >= 5) { setError('Maximum 5 contacts'); return; }
    if (numbers.includes(clean)) { setError('Already added'); return; }
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
    if (clean.length < 10 || clean.length > 13) { setError('Invalid number'); return; }
    setNumbers(prev => prev.map((n, idx) => idx === i ? clean : n));
    setEditing(null); setEditVal(''); setError('');
  }

  function copyMessage() {
    navigator.clipboard.writeText(messageText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const allSent = numbers.length > 0 && numbers.every((_, i) => sentIdx.includes(i));

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
          {/* Message preview */}
          <div className="wa-preview">
            <div className="wa-preview-label">Message preview</div>
            <div className="wa-preview-box" style={{ whiteSpace: 'pre-line' }}>{messageText}</div>
            <button className={`btn-copy-msg ${copied ? 'copied' : ''}`} onClick={copyMessage}>
              {copied ? '✅ Copied!' : '📋 Copy message'}
            </button>
          </div>

          {/* Mobile queue UI */}
          {mobile && mobileQueue !== null && (
            <div className="wa-mobile-queue">
              <div className="wa-queue-label">
                Sending {mobileQueue + 1} of {numbers.length}
              </div>
              <div className="wa-queue-number">
                {formatDisplay(numbers[mobileQueue])}
              </div>
              <button className="btn-wa-queue-send" onClick={sendMobileCurrent}>
                Open WhatsApp → Send message
              </button>
              <button className="wa-cancel" onClick={() => setMobileQueue(null)}>
                Cancel queue
              </button>
            </div>
          )}

          {/* Tip */}
          {mobileQueue === null && (
            <div className="wa-tip">
              {mobile
                ? '📱 Opens WhatsApp app directly. For multiple contacts, tap "Send to all" then follow the queue.'
                : '💡 Each contact opens in its own tab with the message pre-filled.'}
            </div>
          )}

          {/* Add number */}
          {mobileQueue === null && (
            <>
              <div className="wa-add-row">
                <input type="tel" className="text-input" value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && addNumber()}
                  placeholder="10-digit mobile number" maxLength={13} />
                <button className="btn-add" onClick={addNumber} disabled={numbers.length >= 5}>+ Add</button>
              </div>
              {error && <div className="wa-error">{error}</div>}
              <div className="wa-limit-hint">{numbers.length}/5 contacts saved</div>
            </>
          )}

          {/* Numbers list */}
          {mobileQueue === null && numbers.length > 0 && (
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

          {/* Send all button */}
          {mobileQueue === null && numbers.length > 1 && !allSent && (
            <button className="btn-wa-all" onClick={sendAll}>
              📲 Send to all {numbers.length} contacts
            </button>
          )}

          {allSent && numbers.length > 0 && (
            <div className="wa-all-sent">✅ Sent to all {numbers.length} contacts!</div>
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
