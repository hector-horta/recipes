import { Tag } from '../models/Tag.js';
import { redisClient } from '../config/redis.js';
import { ActivityLogger } from './ActivityLogger.js';

const CACHE_KEY = 'tags:all';
const CACHE_TTL = 86400; // 24 hours

export class TagService {
  /**
   * Helper to normalize tag keys for consistent lookup (lowercase, trimmed, no accents)
   */
  static normalizeKey(text) {
    if (!text) return '';
    return text
      .toString()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  /**
   * Get all tags from cache or database
   */
  static async getAllTags() {
    try {
      // 1. Try cache if redis is ready
      if (redisClient.isReady) {
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // 2. Fetch from DB
      const tags = await Tag.findAll({
        order: [['es', 'ASC']]
      });
      
      const plainTags = tags.map(t => t.get({ plain: true }));

      // 3. Update cache if redis is ready
      if (redisClient.isReady) {
        await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(plainTags));
      }

      return plainTags;
    } catch (error) {
      ActivityLogger.error('TagService.getAllTags failed', { error: error.message });
      // Fallback to empty array to prevents app crash, but log error
      return [];
    }
  }

  /**
   * Bulk upsert tags and invalidate cache
   * @param {Array<{es: string, en: string}>} tagsData 
   */
  static async upsertTags(tagsData) {
    if (!Array.isArray(tagsData) || tagsData.length === 0) return;

    try {
      const validTags = tagsData
        .filter(t => t && t.es && t.en)
        .map(t => ({
          key: this.normalizeKey(t.es),
          es: t.es.trim(),
          en: t.en.trim(),
          updated_at: new Date()
        }));

      if (validTags.length === 0) return;

      await Tag.bulkCreate(validTags, {
        updateOnDuplicate: ['es', 'en', 'updated_at']
      });

      // Invalidate cache
      if (redisClient.isReady) {
        await redisClient.del(CACHE_KEY);
      }

      ActivityLogger.info('Tags upserted', { count: validTags.length });
    } catch (error) {
      ActivityLogger.error('TagService.upsertTags failed', { error: error.message });
    }
  }

  /**
   * Translates a list of strings or legacy objects into localized objects.
   * Return null for untranslated tags to allow filtering.
   * @param {Array<string|object>} rawTags 
   * @returns {Promise<Array<{es: string, en: string}|null>>}
   */
  static async getTags(rawTags) {
    if (!Array.isArray(rawTags) || rawTags.length === 0) return [];

    const allTags = await this.getAllTags();
    const tagMap = Object.fromEntries(
      allTags.map(t => [this.normalizeKey(t.key), t])
    );

    return rawTags.map(t => {
      const inputId = typeof t === 'string' ? t : (t.key || t.es || '');
      const key = this.normalizeKey(inputId);
      
      if (tagMap[key]) {
        return { es: tagMap[key].es, en: tagMap[key].en };
      }
      
      // If no translation found, return null (per user request to hide untranslated tags)
      return null;
    });
  }

  /**
   * Explicitly clear tag cache
   */
  static async invalidateCache() {
    if (redisClient.isReady) {
      await redisClient.del(CACHE_KEY);
    }
  }
}
