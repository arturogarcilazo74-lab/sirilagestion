import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA (Only on web/https, never in Electron/file://)
if (window.location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  // We use a dynamic import to prevent the module from even being parsed in Electron
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onOfflineReady() {
        console.log('App ready to work offline');
      },
      onNeedRefresh() {
        if (confirm('Nueva versión disponible. ¿Deseas actualizar?')) {
          window.location.reload();
        }
      },
    });
  }).catch(err => {
    console.error('PWA Skip:', err);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);