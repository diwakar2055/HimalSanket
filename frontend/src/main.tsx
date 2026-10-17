import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Register PWA Service Worker for offline Himalayan resiliency
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA ServiceWorker registration notice:', err);
    });
  });
}

// Asynchronously load dynamic environment config from server before React mounts
async function bootstrap() {
  try {
    const res = await fetch('/api/system/config');
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const config = await res.json();
        (window as any).__APP_CONFIG__ = {
          ...((window as any).__APP_CONFIG__ || {}),
          ...config,
        };
      }
    }
  } catch (err) {
    console.warn('Notice: /api/system/config bootstrap skipped:', err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

bootstrap();
