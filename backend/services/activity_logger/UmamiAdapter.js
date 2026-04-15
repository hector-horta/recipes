import { config } from '../../config/env.js';

/**
 * UmamiAdapter — Envía eventos a Umami Analytics vía API.
 */
export class UmamiAdapter {
  constructor() {
    this.name = 'UmamiAdapter';
    this.url = config.UMAMI_URL || 'http://analytics.localhost';
    this.websiteId = config.UMAMI_WEBSITE_ID;
  }

  async process(action, metadata = {}, options = {}) {
    if (!this.websiteId) {
      // No warn to avoid spamming if not configured
      return;
    }

    // El payload sigue la estructura de Umami Tracking API
    const payload = {
      payload: {
        website: this.websiteId,
        hostname: options.hostname || 'backend-server',
        url: options.url || '/api/backend',
        name: action,
        data: metadata
      },
      type: 'event'
    };

    try {
      const res = await fetch(`${this.url}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Node.js)',
          'X-Forwarded-For': options.ip || '127.0.0.1'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error(`[ActivityLogger] [${this.name}] API Error (${res.status}):`, errText);
      }
    } catch (err) {
      console.error(`[ActivityLogger] [${this.name}] Fetch failed:`, err.message);
    }
  }
}
