import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);

// Installable + offline: precaches the app and every exam pack after the first visit.
// Updates: check whenever the app is opened or brought back to the screen (and hourly while open);
// with autoUpdate the new version activates and the page reloads itself.
if (import.meta.env.VITE_TARGET !== 'artifact' && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(_url, reg) {
        if (!reg) return;
        window.__checkForUpdate = () => reg.update();
        const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 60 * 60 * 1000);
      },
    });
  }).catch(() => {});
}
