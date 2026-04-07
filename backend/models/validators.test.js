import { describe, it, expect } from 'vitest';
import { recipeQuerySchema } from './validators.js';

describe('validators', () => {
  describe('recipeQuerySchema', () => {
    it('should validate empty query object', () => {
      const result = recipeQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate valid query parameters', () => {
      const validQuery = {
        query: 'pasta',
        excludeIngredients: 'tomato,onion',
        diet: 'vegan',
        number: '10',
        sort: 'healthiness'
      };

      const result = recipeQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject query that is too long', () => {
      const longQuery = {
        query: 'a'.repeat(101)
      };

      const result = recipeQuerySchema.safeParse(longQuery);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('max 100 caracteres');
    });

    it('should reject excludeIngredients that is too long', () => {
      const longIngredients = {
        excludeIngredients: 'a'.repeat(501)
      };

      const result = recipeQuerySchema.safeParse(longIngredients);
      expect(result.success).toBe(false);
    });

    it('should reject diet that is too long', () => {
      const longDiet = {
        diet: 'a'.repeat(51)
      };

      const result = recipeQuerySchema.safeParse(longDiet);
      expect(result.success).toBe(false);
    });

    it('should reject invalid number format', () => {
      const invalidNumber = {
        number: 'not-a-number'
      };

      const result = recipeQuerySchema.safeParse(invalidNumber);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('entero válido');
    });

    it('should accept valid number', () => {
      const validNumber = {
        number: '25'
      };

      const result = recipeQuerySchema.safeParse(validNumber);
      expect(result.success).toBe(true);
    });

    it('should reject invalid sort format', () => {
      const longSort = {
        sort: 'a'.repeat(51)
      };

      const result = recipeQuerySchema.safeParse(longSort);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from query', () => {
      const query = {
        query: '  pasta  '
      };

      const result = recipeQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('pasta');
      }
    });

    it('should handle partial validation', () => {
      const partial = {
        query: 'test',
        invalidField: 'should be ignored'
      };

      const result = recipeQuerySchema.safeParse(partial);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('test');
        expect(result.data).not.toHaveProperty('invalidField');
      }
    });

    it('should validate all fields together', () => {
      const complete = {
        query: 'chicken',
        excludeIngredients: 'garlic',
        diet: 'keto',
        number: '5',
        sort: 'relevance'
      };

      const result = recipeQuerySchema.safeParse(complete);
      expect(result.success).toBe(true);
    });
  });
});
