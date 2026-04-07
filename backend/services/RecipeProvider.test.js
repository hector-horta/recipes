import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeProvider } from './RecipeProvider.js';
import { Recipe } from '../models/Recipe.js';
import { redisClient } from '../config/redis.js';

vi.mock('../config/redis.js', () => ({
  redisClient: {
    isReady: false,
    get: vi.fn(),
    setEx: vi.fn(),
    keys: vi.fn(),
    del: vi.fn()
  }
}));

vi.mock('../models/Recipe.js', () => ({
  Recipe: {
    findAll: vi.fn()
  }
}));

describe('RecipeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecipes', () => {
    it('should filter by published status by default', async () => {
      Recipe.findAll.mockResolvedValue([]);

      await RecipeProvider.getRecipes({ query: 'pasta' });

      expect(Recipe.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'published' })
        })
      );
    });

    it('should search by title when query provided', async () => {
      Recipe.findAll.mockResolvedValue([]);

      await RecipeProvider.getRecipes({ query: 'pasta' });

      const callArgs = Recipe.findAll.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('Op.or');
      expect(callArgs.where[Op.or]).toHaveLength(3);
    });

    it('should filter by SIBO risk when user has SIBO intolerance', async () => {
      Recipe.findAll.mockResolvedValue([]);

      const userProfile = { intolerances: ['sibo'] };
      await RecipeProvider.getRecipes({ query: 'pasta' }, userProfile);

      const callArgs = Recipe.findAll.mock.calls[0][0];
      expect(callArgs.where.sibo_risk_level).toEqual({ [Symbol.for('ne')]: 'avoid' });
    });

    it('should use default number of 10 when not specified', async () => {
      Recipe.findAll.mockResolvedValue([]);

      await RecipeProvider.getRecipes({ query: 'test' });

      const callArgs = Recipe.findAll.mock.calls[0][0];
      expect(callArgs.limit).toBe(10);
    });

    it('should use custom number when specified', async () => {
      Recipe.findAll.mockResolvedValue([]);

      await RecipeProvider.getRecipes({ query: 'test', number: 20 });

      const callArgs = Recipe.findAll.mock.calls[0][0];
      expect(callArgs.limit).toBe(20);
    });

    it('should return normalized recipes', async () => {
      const mockRecipes = [
        {
          id: '1',
          title_es: 'Test Recipe',
          title_en: 'Test Recipe EN',
          ingredients: [{ name: { es: 'Ingrediente', en: 'Ingredient' }, quantity: '1', unit: { es: 'taza', en: 'cup' } }],
          steps: [{ order: 1, instruction: { es: 'Paso 1', en: 'Step 1' } }],
          image_url: '/test.jpg',
          prep_time_minutes: 30,
          sibo_risk_level: 'safe',
          tags: ['tag1']
        }
      ];

      Recipe.findAll.mockResolvedValue(mockRecipes);

      const result = await RecipeProvider.getRecipes({ query: 'test' });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', '1');
      expect(result[0]).toHaveProperty('title', 'Test Recipe');
      expect(result[0]).toHaveProperty('titleEn', 'Test Recipe EN');
      expect(result[0].ingredients).toHaveLength(1);
      expect(result[0].instructions).toHaveLength(1);
    });

    it('should handle Redis cache hit', async () => {
      redisClient.isReady = true;
      redisClient.get.mockResolvedValue(JSON.stringify([{ id: 'cached' }]));

      const result = await RecipeProvider.getRecipes({ query: 'test' });

      expect(result).toEqual([{ id: 'cached' }]);
      expect(Recipe.findAll).not.toHaveBeenCalled();
    });

    it('should handle Redis cache miss', async () => {
      redisClient.isReady = true;
      redisClient.get.mockResolvedValue(null);
      Recipe.findAll.mockResolvedValue([]);

      await RecipeProvider.getRecipes({ query: 'test' });

      expect(Recipe.findAll).toHaveBeenCalled();
      expect(redisClient.setEx).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      redisClient.isReady = true;
      redisClient.get.mockRejectedValue(new Error('Redis error'));
      Recipe.findAll.mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(RecipeProvider.getRecipes({ query: 'test' })).resolves.not.toThrow();

      expect(Recipe.findAll).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('normalizeRecipe', () => {
    it('should normalize ingredients with translations', () => {
      const raw = {
        ingredients: [
          { name: { es: 'Harina', en: 'Flour' }, quantity: '2', unit: { es: 'tazas', en: 'cups' } }
        ]
      };

      const normalized = RecipeProvider.normalizeRecipe(raw);

      expect(normalized.ingredients[0]).toEqual({
        id: 'Harina',
        name: 'Harina',
        nameEn: 'Flour',
        quantity: '2',
        unit: 'tazas',
        unitEn: 'cups',
        siboAlert: false
      });
    });

    it('should sort and extract instructions from steps', () => {
      const raw = {
        steps: [
          { order: 2, instruction: { es: 'Step 2', en: 'Step 2 EN' } },
          { order: 1, instruction: { es: 'Step 1', en: 'Step 1 EN' } }
        ]
      };

      const normalized = RecipeProvider.normalizeRecipe(raw);

      expect(normalized.instructions).toEqual(['Step 1', 'Step 2']);
      expect(normalized.instructionsEn).toEqual(['Step 1 EN', 'Step 2 EN']);
    });

    it('should add default instruction when no steps provided', () => {
      const raw = { steps: [] };

      const normalized = RecipeProvider.normalizeRecipe(raw);

      expect(normalized.instructions).toEqual(['Sin instrucciones disponibles.']);
    });

    it('should normalize safety level', () => {
      expect(RecipeProvider.normalizeRecipe({ sibo_risk_level: 'safe' }).safetyLevel).toBe('safe');
      expect(RecipeProvider.normalizeRecipe({ sibo_risk_level: 'caution' }).safetyLevel).toBe('review');
      expect(RecipeProvider.normalizeRecipe({ sibo_risk_level: 'avoid' }).safetyLevel).toBe('unsafe');
    });

    it('should normalize tags to bilingual format', () => {
      const raw = {
        tags: [{ es: 'Desayuno', en: 'Breakfast' }, 'simple']
      };

      const normalized = RecipeProvider.normalizeRecipe(raw);

      expect(normalized.siboAllergiesTags).toEqual([
        { es: 'Desayuno', en: 'Breakfast' },
        { es: 'simple', en: 'simple' }
      ]);
    });

    it('should filter out empty tags', () => {
      const raw = {
        tags: ['', { es: '', en: '' }, 'valid']
      };

      const normalized = RecipeProvider.normalizeRecipe(raw);

      expect(normalized.siboAllergiesTags).toEqual([{ es: 'valid', en: 'valid' }]);
    });
  });

  describe('clearCache', () => {
    it('should clear all recipe cache keys', async () => {
      redisClient.isReady = true;
      redisClient.keys.mockResolvedValue(['recipes:abc', 'recipes:def']);

      await RecipeProvider.clearCache();

      expect(redisClient.keys).toHaveBeenCalledWith('recipes:*');
      expect(redisClient.del).toHaveBeenCalledWith(['recipes:abc', 'recipes:def']);
    });

    it('should handle Redis errors gracefully', async () => {
      redisClient.isReady = true;
      redisClient.keys.mockRejectedValue(new Error('Redis error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(RecipeProvider.clearCache()).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should do nothing when Redis is not ready', async () => {
      redisClient.isReady = false;

      await RecipeProvider.clearCache();

      expect(redisClient.keys).not.toHaveBeenCalled();
    });
  });
});
