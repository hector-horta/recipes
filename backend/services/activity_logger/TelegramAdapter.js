import { config } from '../../config/env.js';

/**
 * TelegramAdapter — Envía alertas críticas a Telegram.
 */
export class TelegramAdapter {
  constructor() {
    this.name = 'TelegramAdapter';
    this.token = config.TELEGRAM_BOT_TOKEN;
    this.userId = config.TELEGRAM_USER_ID;
  }

  async process(action, metadata = {}, options = {}) {
    // Alertas automáticas para errores críticos y sugerencias del chef
    if (action !== 'ERROR' && action !== 'SYSTEM_ERROR' && action !== 'INGEST_FAIL' && action !== 'SUGGEST_TO_CHEF') {
      return;
    }

    if (!this.token || !this.userId) {
      return;
    }

    let message = '';
    
    if (action === 'SUGGEST_TO_CHEF') {
      message = `👨‍🍳 *Chef Suggestion*\n\n` +
        `A user searched for *"${metadata.term || 'unknown'}"* and wants the recipe.\n\n` +
        `👤 User: ${metadata.userInfo || options.userId || 'Guest'}\n` +
        `📍 IP: ${options.ip || 'N/A'}`;
    } else {
      message = `🚨 *Backend ${action}*\n\n` +
        `*Msg:* ${metadata.message || 'Sin mensaje'}\n` +
        `*IP:* ${options.ip || 'N/A'}\n` +
        `*User:* ${options.userId || 'Guest'}`;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.userId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!res.ok) {
        console.error(`[ActivityLogger] [${this.name}] API Error:`, res.status);
      }
    } catch (err) {
      console.error(`[ActivityLogger] [${this.name}] Failed to send alert:`, err.message);
    }
  }
}
