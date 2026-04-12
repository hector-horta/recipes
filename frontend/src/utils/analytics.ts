export const trackEvent = (eventName: string, eventData?: Record<string, any>) => {
  // Ignorar seguimiento en el lado del servidor (SSR) o si no hay entorno de visualización
  if (typeof window === 'undefined') return;

  // 1. Integración actual: Umami Analytics
  if ((window as any).umami && typeof (window as any).umami.track === 'function') {
    if (eventData) {
      (window as any).umami.track(eventName, eventData);
    } else {
      (window as any).umami.track(eventName);
    }
  }

  // 2. Aquí puedes agregar en el futuro otras integraciones de forma fácil:
  // Ejemplo: PostHog
  // if ((window as any).posthog) {
  //   (window as any).posthog.capture(eventName, eventData);
  // }
  
  // Ejemplo: Google Analytics 4
  // if ((window as any).gtag) {
  //   (window as any).gtag('event', eventName, eventData);
  // }
  
  // Ejemplo: Mixpanel
  // if ((window as any).mixpanel) {
  //   (window as any).mixpanel.track(eventName, eventData);
  // }
};
