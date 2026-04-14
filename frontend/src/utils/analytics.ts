interface Umami {
  track: (eventName: string, eventData?: Record<string, string | number | boolean>) => void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

export const trackEvent = (eventName: string, eventData?: Record<string, string | number | boolean>) => {
  // Ignorar seguimiento en el lado del servidor (SSR) o si no hay entorno de visualización
  if (typeof window === 'undefined') return;

  // 1. Integración actual: Umami Analytics
  if (window.umami && typeof window.umami.track === 'function') {
    window.umami.track(eventName, eventData);
  }

  // 2. Aquí puedes agregar en el futuro otras integraciones de forma fácil
};
