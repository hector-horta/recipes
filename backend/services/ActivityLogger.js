import { config } from '../config/env.js';
import { DatabaseAdapter } from './activity_logger/DatabaseAdapter.js';
import { UmamiAdapter } from './activity_logger/UmamiAdapter.js';
import { TelegramAdapter } from './activity_logger/TelegramAdapter.js';

/**
 * ActivityLogger — Fachada unificada para telemetría, logs y alertas.
 * 
 * Implementa el patrón Facade/Adapter para desacoplar el origen de los eventos
 * de sus destinos (Base de Datos, Umami, Telegram, etc).
 */
export class ActivityLogger {
  // Inicialización de adaptadores
  static adapters = [
    new DatabaseAdapter(),
    new UmamiAdapter(),
    new TelegramAdapter()
  ];

  /**
   * Registra un evento en todos los adaptadores habilitados.
   * Fire-and-forget: nunca bloquea el hilo principal.
   * 
   * @param {string} action    Acción normalizada (UPPER_SNAKE_CASE)
   * @param {object} metadata  Datos específicos del evento
   * @param {object} options   Contexto (userId, ip, url, etc)
   */
  static log(action, metadata = {}, options = {}) {
    this.adapters.forEach(adapter => {
      adapter.process(action, metadata, options).catch(err => {
        // Los errores de adaptadores no deben propagarse al flujo principal
        console.error(`[ActivityLogger] Adapter ${adapter.name} failed:`, err.message);
      });
    });
  }

  /**
   * Alias para alertas directas (usado en lógicas heredadas)
   * @param {string} message 
   */
  static async sendTelegramAlert(message) {
    const telegram = this.adapters.find(a => a.name === 'TelegramAdapter');
    if (telegram) {
      return telegram.process('SYSTEM', { message });
    }
  }

  /**
   * Versión asíncrona de alertas.
   * @param {string} message 
   */
  static alertAsync(message) {
    this.sendTelegramAlert(message).catch(err => {
      console.error('[ActivityLogger] Async alert failed:', err.message);
    });
  }

  // --- Métodos de Logging Nivel Consola ---

  static info(message, context = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, Object.keys(context).length ? context : '');
  }

  static warn(message, context = {}) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, Object.keys(context).length ? context : '');
  }

  static error(message, errorObject = null, context = {}) {
    const timestamp = new Date().toISOString();
    const errorMessage = errorObject instanceof Error ? errorObject.message : message;
    const stack = errorObject instanceof Error ? errorObject.stack : null;

    console.error(`[${timestamp}] [ERROR] ${message}:`, errorMessage, Object.keys(context).length ? context : '');
    
    // Persistimos el error críticco en todos los adaptadores
    this.log('SYSTEM_ERROR', { 
      message, 
      errorMessage, 
      stack: config.NODE_ENV === 'production' ? null : stack,
      ...context 
    });
  }
}
