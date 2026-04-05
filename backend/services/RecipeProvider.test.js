import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeProvider } from './RecipeProvider.js';

vi.mock('../config/redis.js', () => ({
  redisClient: {
    isReady: false,
    get: vi.fn(),
    setEx: vi.fn()
  }
}));

vi.mock('../models/Recipe.js', () => ({
  Recipe: {
    findAll: vi.fn()
  }
}));

import { Recipe } from '../models/Recipe.js';

describe('RecipeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by published status by default', async () => {
    Recipe.findAll.mockResolvedValue([]);

    await RecipeProvider.getRecipes({ query: 'pasta' });

    expect(Recipe.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'published' })
      })
    );
  });

  it('should filter by title search when query is provided', async () => {
    Recipe.findAll.mockResolvedValue([]);

    await RecipeProvider.getRecipes({ query: 'pasta' });

    const callArgs = Recipe.findAll.mock.calls[0][0];
    expect(callArgs.where).toHaveProperty('Op.or');
  });

  it('should exclude avoid-level recipes when user has SIBO intolerance', async () => {
    Recipe.findAll.mockResolvedValue([]);

    const userProfile = { intolerances: ['SIBO'] };
    await RecipeProvider.getRecipes({ query: 'pasta' }, userProfile);

    const callArgs = Recipe.findAll.mock.calls[0][0];
    expect(callArgs.where.sibo_risk_level).toEqual({ [Symbol(ne)]: 'avoid' });
  });

  it('should normalize ingredients from recipe data', () => {
    const raw = {
      id: 1,
      title_es: 'Test Recipe',
      title_en: 'Test Recipe EN',
      ingredients: [
        { name: { es: 'Ingrediente A', en: 'Ingredient A' }, quantity: '1', unit: 'cup', siboAlert: false }
      ],
      steps: [
        { order: 1, instruction: { es: 'Paso 1', en: 'Step 1' } }
      ],
      image_url: '/test.jpg',
      sibo_risk_level: 'safe',
      sibo_alerts: [],
      tags: ['test']
    };

    const normalized = RecipeProvider.normalizeRecipe(raw);
    expect(normalized.ingredients).toHaveLength(1);
    expect(normalized.ingredients[0].name).toBe('Ingrediente A');
    expect(normalized.instructions).toContain('Paso 1');
    expect(normalized.safetyLevel).toBe('safe');
  });
});
