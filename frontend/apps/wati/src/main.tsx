import { createRoot } from 'react-dom/client';
import { AuthProvider } from './AuthContext';
import { Providers } from './components/Providers';
import App from './App';
import './index.css';
import './i18n';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <Providers>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Providers>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registrado con éxito:', registration.scope);
    }).catch(error => {
      console.log('Fallo al registrar SW:', error);
    });
  });
}
