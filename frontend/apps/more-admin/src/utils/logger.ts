import { trackEvent } from './analytics';

const IS_DEV = import.meta.env.DEV;

const isEventName = (msg: string) => /^[A-Z0-9_]{3,}$/.test(msg);

interface LogOptions {
  track?: boolean;
  eventData?: Record<string, any>;
}

export const logger = {
  info: (message: string, context: any = {}, options: LogOptions = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`%c[${timestamp}] [INFO] ${message}`, 'color: #3b82f6; font-weight: bold;', context);

    if (options.track || isEventName(message)) {
      trackEvent(message, { ...context, ...options.eventData });
    }
  },

  warn: (message: string, context: any = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`%c[${timestamp}] [WARN] ${message}`, 'color: #f59e0b; font-weight: bold;', context);
  },

  error: (message: string, error?: any, context: any = {}, options: LogOptions = {}) => {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error || '');
    
    console.group(`%c[${timestamp}] [ERROR] ${message}`, 'color: #ef4444; font-weight: bold;');
    console.error('Message:', errorMessage);
    if (context && Object.keys(context).length) {
      console.error('Context:', context);
    }
    console.groupEnd();

    if (options.track || isEventName(message)) {
      trackEvent(message, { 
        ...context, 
        error: errorMessage,
        ...options.eventData 
      });
    }
  },

  track: (eventName: string, data?: Record<string, any>) => {
    if (IS_DEV) {
      const timestamp = new Date().toISOString();
      console.log(`%c[${timestamp}] [TRACK] ${eventName}`, 'color: #8b5cf6; font-style: italic;', data || '');
    }
    trackEvent(eventName, data);
  }
};
