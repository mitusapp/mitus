import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { DevHelperProvider } from '@/contexts/DevHelperContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DevHelperProvider>
          <App />
        </DevHelperProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// ⬇️ Registro global del Service Worker (solo en producción)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-mitus.js').catch(() => {});
  });
}
