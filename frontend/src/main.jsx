import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide the splash screen once React has rendered
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.__hideSplash?.();
  });
});
