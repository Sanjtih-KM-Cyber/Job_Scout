// frontend/src/components/ResumeUpload.jsx
// Supports PDF + DOCX. Always clickable — re-upload anytime without page reload.
import { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ACCEPTED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export function ResumeUpload({ onExtracted }) {
  const [state,    setState]    = useState('idle'); // idle|loading|done|error
  const [filename, setFilename] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  async function processFile(file) {
    if (!file) return;

    const isValid = ACCEPTED.includes(file.type)
      || file.name.endsWith('.pdf')
      || file.name.endsWith('.docx')
      || file.name.endsWith('.doc');

    if (!isValid) {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
      return;
    }

    setFilename(file.name);
    setState('loading');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch(`${API_BASE}/resume/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Parse failed');
      const data = await res.json();
      setState('done');
      onExtracted(data);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  function handleClick() {
    // Always allow re-upload — reset input value so same file can be re-selected
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }

  function handleChange(e) {
    processFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }

  const messages = {
    idle: {
      icon: '📄',
      title: 'Drop your resume to auto-fill',
      sub: 'PDF or Word (.docx) · Skills & role extracted instantly',
    },
    loading: {
      icon: '⚡',
      title: `Scanning ${filename}…`,
      sub: 'AI is reading your experience and target role',
    },
    done: {
      icon: '✅',
      title: filename ? `${filename} · Fields auto-filled` : 'Resume processed',
      sub: 'Click here to upload a different resume',
    },
    error: {
      icon: '❌',
      title: 'Could not read file. Try again.',
      sub: 'PDF or Word (.docx) supported — not scanned images',
    },
  };

  const msg = messages[state];

  return (
    <div
      className={`resume-zone ${dragOver ? 'drag-over' : ''} ${state}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      title={state === 'done' ? 'Click to upload a different resume' : 'Click or drag to upload resume'}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <span className="resume-icon">{msg.icon}</span>
      <div className="resume-text">
        <strong>{msg.title}</strong>
        <span>{msg.sub}</span>
      </div>
      <div className="resume-tag">{state === 'loading' ? 'Processing…' : 'AI Matcher'}</div>
    </div>
  );
}
