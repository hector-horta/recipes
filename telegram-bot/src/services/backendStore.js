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

    if (config.ADMIN_API_KEY) {
      headers['x-admin-key'] = config.ADMIN_API_KEY;
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
  async ingestImage(imageUrl, saveToDb = true, generateImage = true) {
    return this._request('/api/ingest/image', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, saveToDb, generateImage })
    });
  }

  // Ingest Multiple Images
  async ingestImages(imageUrl1, imageUrl2, saveToDb = true, generateImage = true) {
    return this._request('/api/ingest/images', {
      method: 'POST',
      body: JSON.stringify({ imageUrl1, imageUrl2, saveToDb, generateImage })
    });
  }

  // Ingest Text
  async ingestText(text, sourceType = 'telegram', saveToDb = true, generateImage = true) {
    return this._request('/api/ingest/text', {
      method: 'POST',
      body: JSON.stringify({ text, sourceType, saveToDb, generateImage })
    });
  }

  // Transcribe Audio
  async transcribeAudio(audioUrl, language = 'es', saveToDb = true) {
    return this._request('/api/ingest/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioUrl, language, saveToDb })
    });
  }

  // Save/Post Recipe
  async postRecipe(slug, status = 'published') {
    return this._request(`/api/ingest/${slug}/post`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }

  // Publish Recipe (move from draft)
  async publishRecipe(slug) {
    return this._request(`/api/ingest/${slug}/publish`, {
      method: 'POST'
    });
  }

  // Update/Save Recipe (General Save/Draft)
  async saveRecipe(recipe, status = 'published', generateImage = false) {
    return this._request('/api/ingest/save', {
      method: 'POST',
      body: JSON.stringify({ ...recipe, status, generateImage })
    });
  }

  // Save as Draft (Helper)
  async saveDraft(recipe) {
    return this.saveRecipe(recipe, 'draft', true);
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

  // Refresh Image
  async refreshImage(slug, issue = '') {
    return this._request(`/api/ingest/${slug}/refresh-image`, {
      method: 'POST',
      body: JSON.stringify({ issue })
    });
  }
}

export const backendStore = new BackendStore();
