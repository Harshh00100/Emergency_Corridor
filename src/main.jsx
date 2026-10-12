import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles/variables.css';
import './styles/globals.css';
import { AppErrorBoundary } from './components/feedback/AppErrorBoundary';
import { AppProviders } from './app/providers/AppProviders';
import { App } from './app/App';
import { environmentWarnings } from './config/env';

if (import.meta.env.DEV && environmentWarnings.length > 0) console.warn('Environment configuration warnings', environmentWarnings);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((error) => {
    if (import.meta.env.DEV) console.warn('Offline shell registration failed', error);
  }));
}
