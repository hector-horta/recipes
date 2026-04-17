import { trackEvent } from './analytics';

/**
 * Frontend Logger
 * Sigue el patrón de ActivityLogger documentado en el FeatureDevelopmentGuide.
 * Ahora unificado con analytics.ts para manejo automático de eventos.
 */

const IS_DEV = import.meta.env.DEV;

// Detecta si un string está en UPPER_SNAKE_CASE (ej. AUTH_LOGIN_SUCCESS)
// para mapearlo automáticamente como un evento de analítica.
const isEventName = (msg: string) => /^[A-Z0-9_]{3,}$/.test(msg);

interface LogOptions {
  track?: boolean; // Forzar tracking aunque no cumpla el patrón de nombre
  eventData?: Record<string, any>; // Metadatos extra para la analítica
}

export const logger = {
  info: (message: string, context: any = {}, options: LogOptions = {}) => {
    const timestamp = new Date().toISOString();
    
    // 1. Console Log
    console.log(`%c[${timestamp}] [INFO] ${message}`, 'color: #34d399; font-weight: bold;', context);

    // 2. Automatic Analytics Mapping
    if (options.track || isEventName(message)) {
      trackEvent(message, { ...context, ...options.eventData });
    }
  },

  warn: (message: string, context: any = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`%c[${timestamp}] [WARN] ${message}`, 'color: #fbbf24; font-weight: bold;', context);
  },

  error: (message: string, error?: any, context: any = {}, options: LogOptions = {}) => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error || '');
    
    // 1. Console Log
    console.group(`%c[${timestamp}] [ERROR] ${message}`, 'color: #f87171; font-weight: bold;');
    console.error('Message:', errorMessage);
    if (context && Object.keys(context).length) {
      console.error('Context:', context);
    }
    if (error?.stack && IS_DEV) {
      console.error('Stack:', error.stack);
    }
    console.groupEnd();

    // 2. Automatic Analytics Mapping for errors
    if (options.track || isEventName(message)) {
      trackEvent(message, { 
        ...context, 
        error: errorMessage,
        ...options.eventData 
      });
    }
  },

  /**
   * Envía un evento a analytics de forma explícita.
   * Útil cuando no se desea un console.log de tipo INFO.
   */
  track: (eventName: string, data?: Record<string, any>) => {
    if (IS_DEV) {
      const timestamp = new Date().toISOString();
      console.log(`%c[${timestamp}] [TRACK] ${eventName}`, 'color: #60a5fa; font-italic: italic;', data || '');
    }
    trackEvent(eventName, data);
  }
};
