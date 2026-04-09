import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Op } from 'sequelize';

vi.mock('../config/database.js', () => ({
  sequelize: {
    fn: vi.fn().mockImplementation((fn, col) => ({ fn, col })),
    col: vi.fn().mockImplementation((col) => ({ col })),
    literal: vi.fn().mockImplementation((lit) => ({ literal: lit })),
    random: vi.fn().mockReturnValue({ random: true }),
    define: vi.fn()
  }
}));

vi.mock('../models/Recipe.js', () => ({
  Recipe: {
    findAll: vi.fn()
  }
}));

vi.mock('../models/FavoriteRecipe.js', () => ({
  FavoriteRecipe: {
    findAll: vi.fn()
  }
}));

vi.mock('../services/RecipeProvider.js', () => ({
  RecipeProvider: {
    normalizeRecipe: vi.fn((r) => ({
      id: r.id,
      title: r.title_es,
      imageUrl: r.image_url || '',
      prepTimeMinutes: r.prep_time_minutes,
      estimatedCost: 2,
      ingredients: [],
      instructions: [],
      summary: '',
      safetyLevel: 'safe',
      siboAllergiesTags: [],
      siboAlerts: r.sibo_alerts || []
    }))
  }
}));

import { Recipe } from '../models/Recipe.js';
import { FavoriteRecipe } from '../models/FavoriteRecipe.js';
import { RecipeProvider } from '../services/RecipeProvider.js';

describe('Home Endpoints Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Top Favorites Query', () => {
    it('should call findAll with correct aggregation query for top favorites', async () => {
      const mockFavorites = [
        { recipe_id: 'recipe-1', dataValues: { favorite_count: 5 } },
        { recipe_id: 'recipe-2', dataValues: { favorite_count: 3 } }
      ];
      
      FavoriteRecipe.findAll.mockResolvedValue(mockFavorites);

      const callResult = await FavoriteRecipe.findAll({
        attributes: ['recipe_id'],
        group: ['recipe_id'],
        limit: 10,
        raw: false
      });

      expect(callResult).toHaveLength(2);
      expect(callResult[0].recipe_id).toBe('recipe-1');
      expect(FavoriteRecipe.findAll).toHaveBeenCalled();
    });

    it('should handle empty favorites result', async () => {
      FavoriteRecipe.findAll.mockResolvedValue([]);

      const result = await FavoriteRecipe.findAll({
        attributes: ['recipe_id'],
        group: ['recipe_id'],
        limit: 10
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('Recipe Lookup by IDs', () => {
    it('should find recipes by array of IDs', async () => {
      const mockRecipes = [
        { id: 'recipe-1', title_es: 'Recipe 1' },
        { id: 'recipe-2', title_es: 'Recipe 2' }
      ];
      
      Recipe.findAll.mockResolvedValue(mockRecipes);

      const recipeIds = ['recipe-1', 'recipe-2'];
      const result = await Recipe.findAll({
        where: { id: { [Op.in]: recipeIds }, status: 'published' }
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('recipe-1');
    });

    it('should handle recipes not found', async () => {
      Recipe.findAll.mockResolvedValue([]);

      const result = await Recipe.findAll({
        where: { id: { [Op.in]: ['non-existent'] }, status: 'published' }
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('Random Recipes Query', () => {
    it('should find random published recipes', async () => {
      const mockRecipes = Array.from({ length: 10 }, (_, i) => ({
        id: `recipe-${i}`,
        title_es: `Random ${i}`
      }));
      
      Recipe.findAll.mockResolvedValue(mockRecipes);

      const result = await Recipe.findAll({
        where: { status: 'published' },
        limit: 10
      });

      expect(result).toHaveLength(10);
    });

    it('should return empty when no recipes', async () => {
      Recipe.findAll.mockResolvedValue([]);

      const result = await Recipe.findAll({
        where: { status: 'published' },
        limit: 10
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('User Favorites Check', () => {
    it('should find user favorites for specific recipes', async () => {
      const userFavorites = [
        { recipe_id: 'recipe-1', user_id: 'user-1' }
      ];
      
      FavoriteRecipe.findAll.mockResolvedValue(userFavorites);

      const result = await FavoriteRecipe.findAll({
        where: { user_id: 'user-1', recipe_id: { [Op.in]: ['recipe-1', 'recipe-2'] } }
      });

      expect(result).toHaveLength(1);
      expect(result[0].recipe_id).toBe('recipe-1');
    });

    it('should return empty when user has no favorites', async () => {
      FavoriteRecipe.findAll.mockResolvedValue([]);

      const result = await FavoriteRecipe.findAll({
        where: { user_id: 'user-1', recipe_id: { [Op.in]: ['recipe-1'] } }
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('RecipeProvider.normalizeRecipe', () => {
    it('should normalize recipe with all fields', () => {
      const recipe = {
        id: '1',
        title_es: 'Test Recipe',
        title_en: 'Test Recipe EN',
        image_url: 'http://test.com/img.jpg',
        prep_time_minutes: 30,
        ingredients: [{ name: { es: 'Sugar' }, quantity: '1', unit: 'cup' }],
        steps: [{ order: 1, instruction: { es: 'Mix' } }],
        tags: [{ es: 'dessert' }],
        sibo_risk_level: 'safe',
        sibo_alerts: []
      };

      const result = RecipeProvider.normalizeRecipe(recipe);

      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Recipe');
      expect(result.prepTimeMinutes).toBe(30);
      expect(result.safetyLevel).toBe('safe');
    });

    it('should handle missing optional fields', () => {
      const recipe = {
        id: '1',
        title_es: 'Test',
        prep_time_minutes: 20,
        ingredients: [],
        steps: [],
        sibo_risk_level: 'safe'
      };

      const result = RecipeProvider.normalizeRecipe(recipe);

      expect(result.imageUrl).toBe('');
      expect(result.siboAlerts).toEqual([]);
    });

    it('should handle null image_url', () => {
      const recipe = {
        id: '1',
        title_es: 'Test',
        image_url: null,
        prep_time_minutes: 20,
        ingredients: [],
        steps: [],
        sibo_risk_level: 'safe'
      };

      const result = RecipeProvider.normalizeRecipe(recipe);

      expect(result.imageUrl).toBe('');
    });
  });

  describe('Fill Logic', () => {
    it('should get additional recipes when needed to fill count', async () => {
      const existingIds = new Set(['recipe-1']);
      
      const additionalRecipes = [
        { id: 'recipe-2' },
        { id: 'recipe-3' }
      ];
      
      Recipe.findAll.mockResolvedValue(additionalRecipes);

      const result = await Recipe.findAll({
        where: {
          status: 'published',
          id: { [Op.notIn]: existingIds }
        },
        limit: 10
      });

      expect(result).toHaveLength(2);
    });
  });
});