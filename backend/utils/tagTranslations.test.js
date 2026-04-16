import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeTag, normalizeTags } from './tagTranslations.js';
import { TagService } from '../services/TagService.js';

vi.mock('../services/TagService.js', () => ({
  TagService: {
    getAllTags: vi.fn(),
    normalizeKey: (text) => text.toLowerCase().trim().replace(/\s+/g, '_')
  }
}));

describe('tagTranslations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TagService.getAllTags.mockResolvedValue([
      { key: 'avena', es: 'Avena', en: 'Oat' },
      { key: 'desayuno', es: 'Desayuno', en: 'Breakfast' },
      { key: 'vegetariano', es: 'Vegetariano', en: 'Vegetarian' },
      { key: 'oregano', es: 'Orégano', en: 'Oregano' },
      { key: 'lacteos', es: 'Lácteos', en: 'Dairy' },
      { key: 'gluten', es: 'Gluten', en: 'Gluten' },
      { key: 'sibo', es: 'SIBO', en: 'SIBO' },
      { key: 'pan', es: 'Pan', en: 'Bread' },
      { key: 'saludable', es: 'Saludable', en: 'Healthy' }
    ]);
  });

  describe('normalizeTag', () => {
    it('should return Spanish and English for known tags', () => {
      const map = { avena: { es: 'Avena', en: 'Oat' } };
      expect(normalizeTag('avena', map)).toEqual({ es: 'Avena', en: 'Oat' });
    });

    it('should return tag as-is for unknown tags', () => {
      expect(normalizeTag('unknown_tag')).toEqual({ es: 'unknown_tag', en: 'unknown_tag' });
    });
  });

  describe('normalizeTags', () => {
    it('should return empty array for non-array input', async () => {
      expect(await normalizeTags(null)).toEqual([]);
      expect(await normalizeTags(undefined)).toEqual([]);
    });

    it('should normalize array of tags', async () => {
      const tags = ['avena', 'desayuno', 'saludable'];
      const result = await normalizeTags(tags);

      expect(result).toEqual([
        { es: 'Avena', en: 'Oat' },
        { es: 'Desayuno', en: 'Breakfast' },
        { es: 'Saludable', en: 'Healthy' }
      ]);
    });

    it('should remove duplicates', async () => {
      const tags = ['avena', 'Avena', 'AVENA', 'desayuno'];
      const result = await normalizeTags(tags);

      expect(result).toHaveLength(2);
      expect(result[0].es).toBe('Avena');
      expect(result[1].es).toBe('Desayuno');
    });

    it('should filter out empty strings', async () => {
      const tags = ['avena', '', '  ', 'desayuno'];
      const result = await normalizeTags(tags);

      expect(result).toHaveLength(2);
    });

    it('should filter out null and undefined', async () => {
      const tags = ['avena', null, undefined, 'desayuno'];
      const result = await normalizeTags(tags);

      expect(result).toHaveLength(2);
    });

    it('should handle mixed known and unknown tags', async () => {
      const tags = ['avena', 'custom_tag', 'desayuno'];
      const result = await normalizeTags(tags);

      expect(result).toEqual([
        { es: 'Avena', en: 'Oat' },
        { es: 'custom_tag', en: 'custom_tag' },
        { es: 'Desayuno', en: 'Breakfast' }
      ]);
    });

    it('should preserve order while deduplicating', async () => {
      const tags = ['first', 'avena', 'second', 'Avena', 'third'];
      const result = await normalizeTags(tags);

      expect(result.map(t => t.es)).toEqual(['first', 'Avena', 'second', 'third']);
    });
  });
});
