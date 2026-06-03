// frontend/src/components/WhatsAppShare.jsx
// Share a job link to up to 5 WhatsApp numbers.
// Numbers are saved in localStorage so you don't re-enter them each time.

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jobscout:whatsapp-numbers';

function loadNumbers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveNumbers(nums) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nums));
}

export function WhatsAppShare({ job, onClose }) {
  const [numbers, setNumbers]   = useState(loadNumbers);
  const [input, setInput]       = useState('');
  const [editing, setEditing]   = useState(null); // index being edited
  const [editVal, setEditVal]   = useState('');
  const [sent, setSent]         = useState([]);
  const [error, setError]       = useState('');

  useEffect(() => { saveNumbers(numbers); }, [numbers]);

  const jobUrl  = job.sourceUrl || buildFallbackLink(job);
  const message = encodeURIComponent(
    `Hey! Found this job that might interest you:\n\n` +
    `*${job.title}* at *${job.company}*\n` +
    `📍 ${job.city || 'India'}\n` +
    (job.salary ? `💰 ${job.salary}\n` : '') +
    `\n🔗 ${jobUrl}\n\n` +
    `via JobScout AI`
  );

  function cleanNumber(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    return digits;
  }

  function addNumber() {
    const clean = cleanNumber(input.trim());
    if (clean.length < 10) { setError('Enter a valid 10-digit number'); return; }
    if (numbers.length >= 5) { setError('Maximum 5 numbers allowed'); return; }
    if (numbers.includes(clean)) { setError('Number already added'); return; }
    setNumbers(prev => [...prev, clean]);
    setInput('');
    setError('');
  }

  function removeNumber(i) {
    setNumbers(prev => prev.filter((_, idx) => idx !== i));
    setSent(prev => prev.filter(s => s !== i));
  }

  function startEdit(i) {
    setEditing(i);
    setEditVal(numbers[i]);
  }

  function saveEdit(i) {
    const clean = cleanNumber(editVal.trim());
    if (clean.length < 10) { setError('Invalid number'); return; }
    setNumbers(prev => prev.map((n, idx) => idx === i ? clean : n));
    setEditing(null);
    setEditVal('');
    setError('');
  }

  function sendToNumber(number, idx) {
    const url = `https://wa.me/${number}?text=${message}`;
    window.open(url, '_blank');
    setSent(prev => [...prev, idx]);
  }

  function sendToAll() {
    numbers.forEach((num, idx) => {
      setTimeout(() => {
        window.open(`https://wa.me/${num}?text=${message}`, '_blank');
        setSent(prev => [...prev, idx]);
      }, idx * 600); // stagger openings slightly
    });
  }

  function formatDisplay(num) {
    if (num.startsWith('91') && num.length === 12) {
      return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
    }
    return `+${num}`;
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal whatsapp-modal" role="dialog">
        <div className="modal-header">
          <div>
            <div className="modal-pretitle" style={{ color: '#25D366' }}>📲 WhatsApp Share</div>
            <div className="modal-title">
              Send <strong>{job.title}</strong> at <strong>{job.company}</strong>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Message preview */}
          <div className="wa-preview">
            <div className="wa-preview-label">Message preview</div>
            <div className="wa-preview-box">
              {job.title} at {job.company}<br />
              📍 {job.city || 'India'}{job.salary ? ` · 💰 ${job.salary}` : ''}<br />
              🔗 Job link included
            </div>
          </div>

          {/* Add number */}
          <div className="wa-add-row">
            <input
              type="tel"
              className="text-input"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && addNumber()}
              placeholder="Enter mobile number (e.g. 9876543210)"
              maxLength={13}
            />
            <button
              className="btn-add"
              onClick={addNumber}
              disabled={numbers.length >= 5}
            >
              + Add
            </button>
          </div>
          {error && <div className="wa-error">{error}</div>}
          <div className="wa-limit-hint">{numbers.length}/5 numbers added</div>

          {/* Numbers list */}
          {numbers.length > 0 && (
            <ul className="wa-numbers">
              {numbers.map((num, i) => (
                <li key={num} className="wa-number-row">
                  {editing === i ? (
                    <div className="wa-edit-row">
                      <input
                        type="tel"
                        className="text-input"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(i)}
                        autoFocus
                      />
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
                          className={`wa-send-btn ${sent.includes(i) ? 'sent' : ''}`}
                          onClick={() => sendToNumber(num, i)}
                        >
                          {sent.includes(i) ? '✅ Sent' : 'Send'}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Send all */}
          {numbers.length > 1 && (
            <button className="btn-wa-all" onClick={sendToAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.523 5.84L0 24l6.341-1.489A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 01-5.031-1.373l-.361-.214-3.741.979 1.003-3.653-.235-.374A9.857 9.857 0 012.118 12C2.118 6.539 6.539 2.118 12 2.118c5.46 0 9.882 4.421 9.882 9.882 0 5.46-4.422 9.882-9.882 9.882z"/>
              </svg>
              Send to all {numbers.length} contacts
            </button>
          )}

          {numbers.length === 0 && (
            <div className="wa-empty">
              Add up to 5 WhatsApp numbers above.<br />
              Numbers are saved for next time.
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
