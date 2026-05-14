/**
 * Simple Analytics Wrapper for MORE Admin
 */

export const trackEvent = (eventName: string, data?: Record<string, any>) => {
  // In a real scenario, this would call window.umami.track(eventName, data)
  // or any other analytics provider.
  if ((window as any).umami) {
    (window as any).umami.track(eventName, data);
  }
};
