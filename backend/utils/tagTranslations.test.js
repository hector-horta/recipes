import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeTag, normalizeTags } from './tagTranslations.js';

describe('tagTranslations', () => {
  describe('normalizeTag', () => {
    it('should return Spanish and English for known tags', () => {
      expect(normalizeTag('avena')).toEqual({ es: 'Avena', en: 'Oat' });
      expect(normalizeTag('desayuno')).toEqual({ es: 'Desayuno', en: 'Breakfast' });
      expect(normalizeTag('vegetariano')).toEqual({ es: 'Vegetariano', en: 'Vegetarian' });
    });

    it('should handle tags with accents', () => {
      expect(normalizeTag('orégano')).toEqual({ es: 'Orégano', en: 'Oregano' });
      expect(normalizeTag('oregano')).toEqual({ es: 'Orégano', en: 'Oregano' });
    });

    it('should return tag as-is for unknown tags', () => {
      expect(normalizeTag('unknown_tag')).toEqual({ es: 'unknown_tag', en: 'unknown_tag' });
    });

    it('should handle English allergen tags', () => {
      expect(normalizeTag('dairy')).toEqual({ es: 'Lácteos', en: 'Dairy' });
      expect(normalizeTag('gluten')).toEqual({ es: 'Gluten', en: 'Gluten' });
      expect(normalizeTag('sibo')).toEqual({ es: 'SIBO', en: 'SIBO' });
    });

    it('should handle case insensitivity', () => {
      expect(normalizeTag('AVENA')).toEqual({ es: 'Avena', en: 'Oat' });
      expect(normalizeTag('Pan')).toEqual({ es: 'Pan', en: 'Bread' });
    });
  });

  describe('normalizeTags', () => {
    it('should return empty array for non-array input', () => {
      expect(normalizeTags(null)).toEqual([]);
      expect(normalizeTags(undefined)).toEqual([]);
      expect(normalizeTags('string')).toEqual([]);
      expect(normalizeTags(123)).toEqual([]);
    });

    it('should normalize array of tags', () => {
      const tags = ['avena', 'desayuno', 'saludable'];
      const result = normalizeTags(tags);

      expect(result).toEqual([
        { es: 'Avena', en: 'Oat' },
        { es: 'Desayuno', en: 'Breakfast' },
        { es: 'Saludable', en: 'Healthy' }
      ]);
    });

    it('should remove duplicates', () => {
      const tags = ['avena', 'Avena', 'AVENA', 'desayuno'];
      const result = normalizeTags(tags);

      expect(result).toHaveLength(2);
      expect(result[0].es).toBe('Avena');
      expect(result[1].es).toBe('Desayuno');
    });

    it('should filter out empty strings', () => {
      const tags = ['avena', '', '  ', 'desayuno'];
      const result = normalizeTags(tags);

      expect(result).toHaveLength(2);
      expect(result.map(t => t.es)).toEqual(['Avena', 'Desayuno']);
    });

    it('should filter out null and undefined', () => {
      const tags = ['avena', null, undefined, 'desayuno'];
      const result = normalizeTags(tags);

      expect(result).toHaveLength(2);
    });

    it('should handle mixed known and unknown tags', () => {
      const tags = ['avena', 'custom_tag', 'desayuno'];
      const result = normalizeTags(tags);

      expect(result).toEqual([
        { es: 'Avena', en: 'Oat' },
        { es: 'custom_tag', en: 'custom_tag' },
        { es: 'Desayuno', en: 'Breakfast' }
      ]);
    });

    it('should preserve order while deduplicating', () => {
      const tags = ['first', 'avena', 'second', 'Avena', 'third'];
      const result = normalizeTags(tags);

      expect(result.map(t => t.es)).toEqual(['first', 'Avena', 'second', 'third']);
    });

    it('should handle tags with spaces', () => {
      const tags = ['healthy food', 'quick meal'];
      const result = normalizeTags(tags);

      expect(result).toEqual([
        { es: 'healthy food', en: 'healthy food' },
        { es: 'quick meal', en: 'quick meal' }
      ]);
    });
  });
});
