// frontend/src/components/ResumeUpload.jsx
import { useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function ResumeUpload({ onExtracted }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [filename, setFilename] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  async function processFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
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

  function handleChange(e) {
    processFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }

  const messages = {
    idle:    { icon: '📄', title: 'Drop your resume to auto-fill', sub: 'PDF · Skills & role extracted instantly by AI' },
    loading: { icon: '⚡', title: `Scanning ${filename}…`, sub: 'AI is reading your experience and target role' },
    done:    { icon: '✅', title: 'Resume processed · Fields auto-filled below', sub: 'Edit anything you want before searching' },
    error:   { icon: '❌', title: 'Could not read PDF. Try again.', sub: 'Make sure the file is a non-scanned PDF' },
  };
  const msg = messages[state];

  return (
    <div
      className={`resume-zone ${dragOver ? 'drag-over' : ''} ${state}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => state === 'idle' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <span className="resume-icon">{msg.icon}</span>
      <div className="resume-text">
        <strong>{msg.title}</strong>
        <span>{msg.sub}</span>
      </div>
      <div className="resume-tag">AI Matcher</div>
    </div>
  );
}
