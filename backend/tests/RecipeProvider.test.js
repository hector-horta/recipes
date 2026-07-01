import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecipeProvider } from '../services/RecipeProvider.js';
import { Recipe } from '../models/Recipe.js';
import { redisClient } from '../config/redis.js';
import { Op } from 'sequelize';

vi.mock('../config/redis.js', () => ({
  redisClient: {
    isReady: false,
    get: vi.fn(),
    setEx: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
    scanIterator: vi.fn()
  }
}));

vi.mock('../models/Recipe.js', () => {
  const mockRecipe = {
    findAll: vi.fn(),
    count: vi.fn()
  };
  mockRecipe.unscoped = vi.fn(() => mockRecipe);
  return { Recipe: mockRecipe };
});

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
      expect(result.recipes).toHaveLength(1);
    });

    it('should return empty array when no recipes', async () => {
      Recipe.findAll.mockResolvedValue([]);

      const result = await RecipeProvider.getRecipes({ query: '' });

      expect(result.recipes).toHaveLength(0);
    });

    it('should use limit from number parameter', async () => {
      const mockRecipe = {
        toJSON: () => ({ id: '1', title_es: 'Test', title_en: 'Test', image_url: '', prep_time_minutes: 30, ingredients: [], steps: [], tags: [], sibo_risk_level: 'safe' })
      };
      Recipe.findAll.mockResolvedValue([mockRecipe]);

      await RecipeProvider.getRecipes({ query: '', number: 5 });

      const callArgs = Recipe.findAll.mock.calls[0][0];
      expect(callArgs.limit).toBe(5);
    });

    it('should include Ingredient association and format search conditions for ingredients', async () => {
      Recipe.findAll
        .mockResolvedValueOnce([{ id: '1' }]) // First call returns matching recipe IDs
        .mockResolvedValueOnce([{
          id: '1',
          title_es: 'Pan',
          title_en: 'Bread',
          image_url: '',
          prep_time_minutes: 30,
          ingredients: [],
          steps: [],
          tags: [],
          sibo_risk_level: 'safe',
          toJSON() {
            return {
              id: '1',
              title_es: 'Pan',
              title_en: 'Bread',
              image_url: '',
              prep_time_minutes: 30,
              ingredients: [],
              steps: [],
              tags: [],
              sibo_risk_level: 'safe'
            };
          }
        }]); // Second call returns full recipe records

      const result = await RecipeProvider.getRecipes({ query: 'pan' });

      // Verify the first findAll call fetched IDs and included recipeIngredients
      const firstCallArgs = Recipe.findAll.mock.calls[0][0];
      expect(firstCallArgs.attributes).toContain('id');
      expect(firstCallArgs.include).toBeDefined();
      expect(firstCallArgs.include[0].as).toBe('recipeIngredients');

      // Verify search conditions search on recipeIngredients name fields
      const andConditions = firstCallArgs.where[Op.and];
      expect(andConditions).toBeDefined();

      const orConditions = andConditions[1][Op.or];
      const hasIngredientNameSearchEs = orConditions.some(cond => cond['$recipeIngredients.name_es$'] !== undefined);
      const hasIngredientNameSearchEn = orConditions.some(cond => cond['$recipeIngredients.name_en$'] !== undefined);
      
      expect(hasIngredientNameSearchEs).toBe(true);
      expect(hasIngredientNameSearchEn).toBe(true);
      expect(result.total).toBe(1);
    });

    it('should call count with distinct options for correct pagination count', async () => {
      Recipe.findAll.mockResolvedValue([]);
      Recipe.count.mockResolvedValue(12);

      const result = await RecipeProvider.getRecipes({ query: '' });

      expect(Recipe.count).toHaveBeenCalledWith(expect.objectContaining({
        distinct: true,
        col: 'id'
      }));
      expect(result.total).toBe(12);
    });

    it('should slice results in-memory with offset and limit when hasFilters is true', async () => {
      const mockRecipes = Array.from({ length: 5 }, (_, idx) => ({
        id: String(idx + 1),
        title_es: `Recipe ${idx + 1}`,
        title_en: `Recipe ${idx + 1}`,
        image_url: '',
        prep_time_minutes: 30,
        sibo_risk_level: 'safe',
        ingredients: [],
        steps: [],
        tags: [],
        toJSON() {
          return {
            id: String(idx + 1),
            title_es: `Recipe ${idx + 1}`,
            title_en: `Recipe ${idx + 1}`,
            image_url: '',
            prep_time_minutes: 30,
            sibo_risk_level: 'safe',
            ingredients: [],
            steps: [],
            tags: []
          };
        }
      }));

      Recipe.findAll.mockResolvedValue(mockRecipes);

      const result = await RecipeProvider.getRecipes(
        { query: '', offset: 2, number: 2 },
        { intolerances: ['egg'] }
      );

      expect(result.recipes).toHaveLength(2);
      expect(result.recipes[0].id).toBe('3');
      expect(result.recipes[1].id).toBe('4');
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

    it('should show "safe" for SIBO-caution recipe if user does NOT have SIBO', () => {
      const recipe = {
        id: '1',
        title_es: 'Honey Cake',
        sibo_risk_level: 'caution',
        ingredients: [{ name: 'miel' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['egg'] }); // Only egg allergy
      expect(result.safetyLevel).toBe('safe');
    });

    it('should show "review" for SIBO-caution recipe if user has SIBO', () => {
      const recipe = {
        id: '1',
        title_es: 'Honey Cake',
        sibo_risk_level: 'caution',
        ingredients: [{ name: 'miel' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['sibo'] });
      expect(result.safetyLevel).toBe('review');
    });

    it('should show "unsafe" for recipe containing allergens for the user by default (severe)', () => {
      const recipe = {
        id: '1',
        title_es: 'Omelette',
        sibo_risk_level: 'safe',
        ingredients: [{ name: 'huevo' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['egg'] });
      expect(result.safetyLevel).toBe('unsafe');
    });

    it('should show "safe" for guest (no intolerances)', () => {
      const recipe = {
        id: '1',
        title_es: 'Honey Cake',
        sibo_risk_level: 'caution',
        ingredients: [{ name: 'miel' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: [] });
      expect(result.safetyLevel).toBe('safe');
    });

    it('should handle null userProfile safely (guest case)', () => {
      const recipe = {
        id: '1',
        title_es: 'Test',
        ingredients: [{ name: 'huevo' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, null);
      expect(result.safetyLevel).toBe('safe');
    });

    it('should only show canonical categories and dietary highlights', () => {
      const recipe = {
        id: '1',
        title_es: 'Test',
        tags: ['vegano', 'saludable', 'pan']
      };
      
      const mockTagMap = {
        'vegano': { es: 'Vegano', en: 'Vegan' },
        'saludable': { es: 'Saludable', en: 'Healthy' },
        'pan': { es: 'Pan', en: 'Bread' }
      };
      const result = RecipeProvider.normalizeRecipe(recipe, null, mockTagMap);
      const tags = result.siboAllergiesTags.map(t => t.es);
      expect(tags).toContain('Vegano');
      expect(tags).not.toContain('Saludable');
      expect(tags).not.toContain('Pan');
    });

    it('should map legacy SIBO/FODMAP tags to "Low FODMAP"', () => {
      const recipe = {
        id: '1',
        title_es: 'Safe Recipe',
        tags: ['sibo_safe', 'bajo_en_fodmap']
      };
      
      const mockTagMap = {
        'sibo_safe': { es: 'SIBO Safe', en: 'SIBO Safe' },
        'bajo_en_fodmap': { es: 'Bajo en FODMAP', en: 'Low FODMAP' }
      };
      const result = RecipeProvider.normalizeRecipe(recipe, null, mockTagMap);
      const tags = result.siboAllergiesTags.map(t => t.es);
      expect(tags).toContain('Bajo en FODMAP');
      expect(tags).not.toContain('SIBO Safe');
      expect(tags).toHaveLength(1); // Only one Low FODMAP tag
    });

    it('should auto-categorize recipe based on title keywords', () => {
      const recipe = {
        id: '1',
        title_es: 'Jugo de Naranja',
        title_en: 'Orange Juice',
        ingredients: [],
        tags: []
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, null, {});
      const tags = result.siboAllergiesTags.map(t => t.es);
      expect(tags).toContain('Bebestible');
    });

    it('should categorize as both Drink and Dessert if keywords match both', () => {
      const recipe = {
        id: '1',
        title_es: 'Chocolate Caliente Dulce',
        title_en: 'Sweet Hot Chocolate',
        ingredients: [],
        tags: []
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, null, {});
      const tags = result.siboAllergiesTags.map(t => t.es);
      expect(tags).toContain('Bebestible');
      expect(tags).toContain('Postre');
    });

    it('should filter out redundant "Favorito" and "Favorite" tags and unrelated tags like "Saludable"', () => {
      const recipe = {
        id: '1',
        title_es: 'Ensalada',
        tags: ['Favorito', 'Favorite', 'Saludable', 'entrada']
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, null, {
        'entrada': { es: 'Entrada', en: 'Starter Dish' }
      });
      const tags = result.siboAllergiesTags.map(t => t.es.toLowerCase());
      expect(tags).toContain('entrada');
      expect(tags).not.toContain('saludable');
      expect(tags).not.toContain('favorito');
      expect(tags).not.toContain('favorite');
    });

    it('should not trigger false positives with substring matches (e.g., "tuna" in "aceitunas")', () => {
      const recipe = {
        id: '1',
        title_es: 'Ensalada de aceitunas',
        ingredients: [{ name: 'aceitunas' }]
      };
      
      // 'seafood' allergy has 'tuna' as a trigger. 
      // 'aceitunas' should NOT trigger a 'seafood' warning.
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['seafood'] });
      expect(result.safetyLevel).toBe('safe');
    });

    it('should correctly identify plural forms of triggers (e.g., "huevos" for "huevo")', () => {
      const recipe = {
        id: '1',
        title_es: 'Omelette',
        ingredients: [{ name: 'Huevos frescos' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['egg'] });
      expect(result.safetyLevel).toBe('unsafe');
    });

    it('should correctly identify plural forms with "es" (e.g., "atunes" for "atun")', () => {
      const recipe = {
        id: '1',
        title_es: 'Ensalada',
        ingredients: [{ name: 'Lata de atunes' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['seafood'] });
      expect(result.safetyLevel).toBe('unsafe');
    });

    it('should be accent-insensitive (e.g., "atún" matches trigger "atun")', () => {
      const recipe = {
        id: '1',
        title_es: 'Ensalada de Atún',
        ingredients: [{ name: 'atún' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['seafood'] });
      expect(result.safetyLevel).toBe('unsafe');
    });

    it('should handle intolerance IDs with suffixes (e.g., "egg_anafilaxis" should map to "egg")', () => {
      const recipe = {
        id: '1',
        title_es: 'Omelette',
        ingredients: [{ name: 'huevos' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['egg_anafilaxis'] });
      expect(result.safetyLevel).toBe('unsafe');
    });

    it('should still support simple whole-word matching at start of string', () => {
      const recipe = {
        id: '1',
        title_es: 'Huevo frito',
        ingredients: [{ name: 'Huevo' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { intolerances: ['egg'] });
      expect(result.safetyLevel).toBe('unsafe');
    });

    it('should show "review" for mild severity level', () => {
      const recipe = {
        id: '1',
        title_es: 'Omelette',
        ingredients: [{ name: 'huevo' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { 
        intolerances: ['egg'],
        severities: { egg: 'mild' }
      });
      expect(result.safetyLevel).toBe('review');
    });

    it('should show "unsafe" for severe severity level', () => {
      const recipe = {
        id: '1',
        title_es: 'Omelette',
        ingredients: [{ name: 'huevo' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { 
        intolerances: ['egg'],
        severities: { egg: 'severe' }
      });
      expect(result.safetyLevel).toBe('unsafe');
      // ingrediente también debería marcarse con isBorderlineSafe
      expect(result.ingredients[0].isBorderlineSafe).toBe(true);
    });

    it('should set isBorderlineSafe to true for ingredients matching a mild intolerance', () => {
      const recipe = {
        id: '1',
        title_es: 'Omelette',
        ingredients: [{ name: 'huevo' }]
      };
      
      const result = RecipeProvider.normalizeRecipe(recipe, { 
        intolerances: ['egg'],
        severities: { egg: 'mild' }
      });
      expect(result.safetyLevel).toBe('review');
      expect(result.ingredients[0].isBorderlineSafe).toBe(true);
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      redisClient.isReady = true;
      redisClient.del.mockClear();
    });

    afterEach(() => {
      redisClient.isReady = false;
    });

    it('should delete keys in batches when keys exist', async () => {
      const mockKeys = Array.from({ length: 105 }, (_, i) => `recipes:test:${i}`);
      redisClient.scanIterator = vi.fn().mockImplementation(() => {
        return {
          async *[Symbol.asyncIterator]() {
            for (const key of mockKeys) {
              yield key;
            }
          }
        };
      });

      redisClient.del.mockResolvedValue(1);

      await RecipeProvider.clearCache(true); // force = true

      expect(redisClient.scanIterator).toHaveBeenCalledWith({
        MATCH: 'recipes:*',
        COUNT: 100
      });
      expect(redisClient.del).toHaveBeenCalledTimes(2);
      expect(redisClient.del.mock.calls[0][0]).toHaveLength(100);
      expect(redisClient.del.mock.calls[1][0]).toHaveLength(5);
    });

    it('should respect cooldown when force is false', async () => {
      redisClient.scanIterator = vi.fn().mockImplementation(() => {
        return {
          async *[Symbol.asyncIterator]() {
            yield 'recipes:test:1';
          }
        };
      });

      await RecipeProvider.clearCache(true);
      expect(redisClient.scanIterator).toHaveBeenCalledTimes(1);

      redisClient.scanIterator.mockClear();

      await RecipeProvider.clearCache(false);
      expect(redisClient.scanIterator).not.toHaveBeenCalled();
    });

    it('should ignore cooldown when force is true', async () => {
      redisClient.scanIterator = vi.fn().mockImplementation(() => {
        return {
          async *[Symbol.asyncIterator]() {
            yield 'recipes:test:1';
          }
        };
      });

      await RecipeProvider.clearCache(true);
      expect(redisClient.scanIterator).toHaveBeenCalledTimes(1);

      redisClient.scanIterator.mockClear();

      await RecipeProvider.clearCache(true);
      expect(redisClient.scanIterator).toHaveBeenCalledTimes(1);
    });
  });
});
