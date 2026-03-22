import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeProvider } from './RecipeProvider.js';

global.fetch = vi.fn();
// Mock Redis to avoid connection issues during tests
vi.mock('../config/redis.js', () => ({
  redisClient: {
    isReady: false,
    get: vi.fn(),
    setEx: vi.fn()
  }
}));

describe('RecipeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPOONACULAR_KEY = 'test-key';
  });

  it('should include maxReadyTime=30 in the API call', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] })
    });

    await RecipeProvider.getRecipes({ query: 'pasta' });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('maxReadyTime=30'), expect.any(Object));
  });

  it('should map SIBO intolerance to Low FODMAP diet', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] })
    });

    const userProfile = { intolerances: ['SIBO'], diet: 'None' };
    await RecipeProvider.getRecipes({ query: 'pasta' }, userProfile);
    
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('diet=Low+FODMAP'), expect.any(Object));
  });

  it('should include profile excluded ingredients and intolerances in the query', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] })
    });

    const userProfile = { 
        intolerances: ['dairy', 'peanut'], 
        excluded_ingredients: 'onion,garlic',
        diet: 'Vegan'
    };
    await RecipeProvider.getRecipes({ query: 'salad', excludeIngredients: 'shellfish' }, userProfile);
    
    const callUrl = fetch.mock.calls[0][0];
    expect(callUrl).toContain('excludeIngredients=shellfish%2Cdairy%2Cpeanut%2Conion%2Cgarlic');
    expect(callUrl).toContain('diet=Vegan');
  });

  it('should normalize ingredients from both extendedIngredients and analyzedInstructions', () => {
    const raw = [{
      id: 1,
      title: 'Test',
      extendedIngredients: [{ id: 101, name: 'Ingredient A' }],
      analyzedInstructions: [{
        steps: [{ ingredients: [{ name: 'Ingredient B' }] }]
      }]
    }];

    const normalized = RecipeProvider.normalizeRecipes(raw);
    expect(normalized[0].ingredients).toHaveLength(2);
    expect(normalized[0].ingredients.map(i => i.name)).toContain('Ingredient A');
    expect(normalized[0].ingredients.map(i => i.name)).toContain('Ingredient B');
  });
});
