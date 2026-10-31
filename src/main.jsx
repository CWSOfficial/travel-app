import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/posthogInit'
import { initMetaPixel } from '@/lib/metaPixel';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// ── Meta Pixel: load only if the user already accepted analytics cookies ──
// Returning visitors with prior consent get the pixel on load; first-time
// visitors get nothing until they accept via the CookieBanner, which calls
// initMetaPixel() again mid-session (no reload needed).
initMetaPixel();

// ── PWA: Register service worker (production only) ──
// In dev, Vite serves JS from /node_modules/.vite/deps/ with cache-busting
// query params. A stale-while-revalidate SW can serve outdated React chunks,
// causing "Cannot read properties of null (reading 'useState')" errors.
// We must block rendering until SW cleanup completes — if a stale SW is found,
// reload the page so the fresh JS chunks load without SW interception.
async function cleanupStaleServiceWorker() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs.length === 0) return false;
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    return true; // a stale SW was found and removed — need reload
  } catch {
    return false;
  }
}

if (import.meta.env.DEV) {
  cleanupStaleServiceWorker().then((foundStale) => {
    if (foundStale) {
      window.location.reload();
    }
  });
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failure is non-fatal — app works normally without it
    });
  });
}