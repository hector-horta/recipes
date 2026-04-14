import { config } from '../config.js';
import { logger } from '../utils/logger.js';

class BackendStore {
  constructor() {
    this.baseUrl = config.BACKEND_URL;
  }

  async _request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (config.EXTERNAL_API_KEY) {
      headers['x-api-key'] = config.EXTERNAL_API_KEY;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        // Handle specific conflict status
        if (response.status === 409) {
          return { conflict: true, recipe: data.recipe, status: 409 };
        }
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error(`Backend request failed: ${url}`, { error: error.message });
      throw error;
    }
  }

  // Ingest Image
  async ingestImage(imageUrl) {
    return this._request('/api/ingest/image', {
      method: 'POST',
      body: JSON.stringify({ imageUrl })
    });
  }

  // Ingest Multiple Images
  async ingestImages(imageUrl1, imageUrl2) {
    return this._request('/api/ingest/images', {
      method: 'POST',
      body: JSON.stringify({ imageUrl1, imageUrl2 })
    });
  }

  // Ingest Text
  async ingestText(text, sourceType = 'telegram') {
    return this._request('/api/ingest/text', {
      method: 'POST',
      body: JSON.stringify({ text, sourceType })
    });
  }

  // Transcribe Audio
  async transcribeAudio(audioUrl, language = 'es') {
    return this._request('/api/ingest/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioUrl, language })
    });
  }

  // Save/Post Recipe
  async postRecipe(slug, status = 'published') {
    return this._request(`/api/ingest/${slug}/post`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }

  // Update/Save Recipe (Overwrite)
  async saveRecipe(recipe) {
    return this._request('/api/ingest/save', {
      method: 'POST',
      body: JSON.stringify(recipe)
    });
  }

  // Get CSV
  async getCSV(slug) {
    const response = await fetch(`${this.baseUrl}/api/ingest/${slug}/csv`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to fetch CSV');
    return response.text();
  }

  // Get Curl
  async getCurl(slug) {
    return this._request(`/api/ingest/${slug}/curl`, { method: 'POST' });
  }
}

export const backendStore = new BackendStore();
