import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import App from './App.tsx';
import './index.css';
import { MedicalRegistry } from './api/MedicalRegistry';
import { SecurityScrubber } from './api/SecurityScrubber';

// Inicialización de Grado Médico antes de renderizar la UI
const boostrap = async () => {
  // 1. Sincronizar firmas de riesgos (FODMAPs/Alérgenos)
  await MedicalRegistry.syncTriggers();
  
  // 2. Inicializar el motor de escaneo de seguridad
  await SecurityScrubber.initialize();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
};

boostrap();

// Registrar Service Worker para soporte Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registrado con éxito:', registration.scope);
    }).catch(error => {
      console.log('Fallo al registrar SW:', error);
    });
  });
}
