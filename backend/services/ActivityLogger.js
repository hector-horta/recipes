import { ActivityLog } from '../models/ActivityLog.js';
import { SearchLog } from '../models/SearchLog.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

/**
 * ActivityLogger — Telemetría asíncrona y alertas Telegram
 *
 * IMPORTANTE: Todos los métodos son fire-and-forget.
 * Nunca bloquean ni pueden romper un request HTTP.
 */
export class ActivityLogger {
  /**
   * Registra un evento de actividad en la base de datos.
   * El write es asíncrono: errores se loguean en consola, no se propagan.
   *
   * @param {'SEARCH'|'VIEW_RECIPE'|'ADD_FAVORITE'|'INGEST_SUCCESS'|'INGEST_FAIL'} action
   * @param {object} metadata  Datos adicionales (query, recipeId, title, error, ...)
   * @param {object} options   { userId, ip, failedSearch }
   */
  static log(action, metadata = {}, options = {}) {
    const { userId = null, ip = null, failedSearch = false } = options;

    ActivityLog.create({
      action,
      metadata,
      failed_search: failedSearch,
      user_id: userId,
      ip
    }).catch(err =>
      console.error(`[ActivityLogger] DB write failed (${action}):`, err.message)
    );

    if (failedSearch && metadata.query) {
      SearchLog.create({
        term: metadata.query,
        status: 'failed',
        conversion: false,
        user_id: userId,
        ip
      }).catch(err =>
        console.error(`[ActivityLogger] SearchLog write failed:`, err.message)
      );
    }
  }

  /**
   * Envía un mensaje de alerta al owner vía Telegram Bot API.
   * Llamada directa — no depende del contenedor telegram-bot.
   *
   * @param {string} message  Texto en Markdown
   * @returns {Promise<void>}
   */
  static async sendTelegramAlert(message) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_USER_ID) {
      console.warn('[ActivityLogger] Telegram credentials not configured, skipping alert.');
      return;
    }

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_USER_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        }
      );

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.error(`[ActivityLogger] Telegram API error (${res.status}):`, err);
      }
    } catch (err) {
      console.error('[ActivityLogger] Telegram fetch failed:', err.message);
    }
  }

  /**
   * Fire-and-forget Telegram alert — errores solo se loguean.
   * Usa esta versión en rutas HTTP para no bloquear la respuesta.
   *
   * @param {string} message
   */
  static alertAsync(message) {
    ActivityLogger.sendTelegramAlert(message).catch(err =>
      console.error('[ActivityLogger] Async alert failed:', err.message)
    );
  }
}
