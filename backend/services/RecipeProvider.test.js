import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeProvider } from './RecipeProvider.js';

global.fetch = vi.fn();

describe('RecipeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SPOONACULAR_KEY = 'test-key';
  });

  const mockSpoonacularResults = [
    {
      id: 715415,
      title: "Red Lentil Soup",
      image: "https://img.spoonacular.com/recipes/715415-556x370.jpg",
      readyInMinutes: 55,
      pricePerServing: 244,
      diets: ["gluten free", "dairy free"],
      summary: "A hearty and nutritious soup...",
      extendedIngredients: [
        { id: 1, name: "red lentils" },
        { id: 2, name: "garlic" }
      ],
      analyzedInstructions: [{
        steps: [
          { step: "Sauté garlic.", ingredients: [{ name: "garlic" }] },
          { step: "Add lentils.", ingredients: [{ name: "red lentils" }] }
        ]
      }]
    }
  ];

  it('should fetch and normalize recipes correctly', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockSpoonacularResults })
    });

    const results = await RecipeProvider.getRecipes({ query: 'soup' });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('query=soup'), expect.any(Object));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('apiKey=test-key'), expect.any(Object));
    
    expect(results).toHaveLength(1);
    const normalized = results[0];
    expect(normalized.id).toBe('715415');
    expect(normalized.title).toBe('Red Lentil Soup');
    expect(normalized.imageUrl).toBe('https://img.spoonacular.com/recipes/715415-556x370.jpg');
    expect(normalized.prepTimeMinutes).toBe(55);
    expect(normalized.estimatedCost).toBe(3); // 244 / 100 = 2.44 -> ceil(2.44) = 3
    expect(normalized.ingredients).toContainEqual({ id: '1', name: 'red lentils' });
    expect(normalized.ingredients).toContainEqual({ id: '2', name: 'garlic' });
    expect(normalized.instructions).toEqual(['Sauté garlic.', 'Add lentils.']);
    expect(normalized.siboAllergiesTags).toEqual(["gluten free", "dairy free"]);
  });

  it('should handle empty result results gracefully', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] })
    });

    const results = await RecipeProvider.getRecipes({});
    expect(results).toEqual([]);
  });

  it('should throw an error when API response is not ok', async () => {
    fetch.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized'
    });

    await expect(RecipeProvider.getRecipes({})).rejects.toThrow('Spoonacular API error: Unauthorized');
  });

  it('should handle missing fields in Spoonacular results', async () => {
     fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 123, title: 'Minimal' }] })
    });

    const results = await RecipeProvider.getRecipes({});
    expect(results[0]).toMatchObject({
      id: '123',
      title: 'Minimal',
      imageUrl: '',
      prepTimeMinutes: 0,
      estimatedCost: 1, // ceil(0/100) -> 0 -> max(1, 0) -> 1
      ingredients: [],
      instructions: [''],
      summary: '',
      siboAllergiesTags: []
    });
  });
});
