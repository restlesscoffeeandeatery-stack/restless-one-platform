import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './App.css';

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  window.__restlessInstallPrompt = event;
  window.dispatchEvent(new Event('pwa-install-ready'));
});

window.addEventListener('appinstalled', () => {
  window.__restlessInstallPrompt = null;
  window.dispatchEvent(new Event('pwa-installed'));
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
