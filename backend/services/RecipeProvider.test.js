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
      const mockRecipe = {
        id: '1',
        title_es: 'Test Recipe',
        title_en: 'Test Recipe EN',
        image_url: 'http://test.com/img.jpg',
        prep_time_minutes: 30,
        ingredients: [],
        steps: [],
        tags: ['tag1'],
        sibo_risk_level: 'safe',
        toJSON: () => ({
            id: '1',
            title_es: 'Test Recipe',
            title_en: 'Test Recipe EN',
            image_url: 'http://test.com/img.jpg',
            prep_time_minutes: 30,
            ingredients: [],
            steps: [],
            tags: ['tag1'],
            sibo_risk_level: 'safe'
        })
      };
      Recipe.findAll.mockResolvedValue([mockRecipe]);

      const result = await RecipeProvider.getRecipes({ query: '' });

      expect(Recipe.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no recipes', async () => {
      Recipe.findAll.mockResolvedValue([]);

      const result = await RecipeProvider.getRecipes({ query: '' });

      expect(result).toHaveLength(0);
    });

    it('should use limit from number parameter', async () => {
      const mockRecipe = {
        toJSON: () => ({ id: '1', title_es: 'Test', title_en: 'Test', image_url: '', prep_time_minutes: 30, ingredients: [], steps: [], tags: [], sibo_risk_level: 'safe' })
      };
      Recipe.findAll.mockResolvedValue([mockRecipe]);

      await RecipeProvider.getRecipes({ query: 'test', number: 5 });

      const callArgs = Recipe.findAll.mock.calls[0][0];
      expect(callArgs.limit).toBe(5);
    });
  });

  describe('normalizeRecipe', () => {
    it('should return normalized recipe object', () => {
      const recipe = {
        id: '1',
        title_es: 'Test Recipe',
        title_en: 'Test Recipe EN',
        image_url: 'http://test.com/img.jpg',
        prep_time_minutes: 30,
        ingredients: [{ name: { es: 'Ingredient 1', en: 'Ingredient 1 EN' }, quantity: '1', unit: 'cup', siboAlert: false }],
        steps: [{ order: 1, instruction: { es: 'Step 1', en: 'Step 1 EN' } }],
        tags: [{ es: 'tag1', en: 'tag1' }],
        sibo_risk_level: 'safe',
        sibo_alerts: []
      };

      const result = RecipeProvider.normalizeRecipe(recipe);

      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Recipe');
      expect(result.ingredients).toHaveLength(1);
    });

    it('should handle recipe without optional fields', () => {
      const recipe = {
        id: '1',
        title_es: 'Test',
        image_url: null,
        prep_time_minutes: 20,
        ingredients: [],
        steps: [],
        tags: null,
        sibo_risk_level: 'safe'
      };

      const result = RecipeProvider.normalizeRecipe(recipe);

      expect(result.id).toBe('1');
      expect(result.imageUrl).toBe('');
    });

    it('should filter empty tags', () => {
      const recipe = {
        id: '1',
        title_es: 'Test',
        image_url: '',
        prep_time_minutes: 20,
        ingredients: [],
        steps: [],
        tags: [{ es: 'tag1', en: 'tag1' }],
        sibo_risk_level: 'safe'
      };

      const result = RecipeProvider.normalizeRecipe(recipe);

      expect(result.siboAllergiesTags).toBeDefined();
    });
  });
});