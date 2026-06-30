import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NutriRecipeService } from '../services/NutriRecipeService.js';
import { Recipe } from '../models/Recipe.js';
import { RecipeProvider } from '../services/RecipeProvider.js';

vi.mock('../models/Recipe.js', () => ({
  Recipe: {
    findAll: vi.fn(),
    findAndCountAll: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../services/RecipeProvider.js', () => ({
  RecipeProvider: {
    clearCache: vi.fn()
  }
}));

describe('NutriRecipeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNutriRecipes', () => {
    it('should get recipes with organization filter and no pagination', async () => {
      const mockRecipes = [
        { id: '1', title_es: 'Receta Global', organization_id: null },
        { id: '2', title_es: 'Receta Org', organization_id: 'org-123' }
      ];
      Recipe.findAll.mockResolvedValue(mockRecipes);

      const result = await NutriRecipeService.getNutriRecipes('org-123');

      expect(Recipe.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.any(Object),
        order: [['created_at', 'DESC']]
      }));
      expect(result).toEqual(mockRecipes);
    });

    it('should get recipes with pagination parameters', async () => {
      const mockRows = [{ id: '2', title_es: 'Receta Org', organization_id: 'org-123' }];
      Recipe.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });

      const result = await NutriRecipeService.getNutriRecipes('org-123', '5', '0');

      expect(Recipe.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 5,
        offset: 0
      }));
      expect(result).toEqual({ recipes: mockRows, total: 1 });
    });
  });

  describe('createNutriRecipe', () => {
    it('should successfully create an organization recipe', async () => {
      const inputData = { title_es: 'Nueva Receta', title_en: 'New Recipe' };
      const createdRecipe = { id: '3', ...inputData, organization_id: 'org-123', source_type: 'manual' };
      Recipe.create.mockResolvedValue(createdRecipe);

      const result = await NutriRecipeService.createNutriRecipe('org-123', inputData);

      expect(Recipe.create).toHaveBeenCalledWith({
        ...inputData,
        organization_id: 'org-123',
        source_type: 'manual'
      });
      expect(RecipeProvider.clearCache).toHaveBeenCalled();
      expect(result).toEqual(createdRecipe);
    });

    it('should fail if organizationId is missing', async () => {
      await expect(NutriRecipeService.createNutriRecipe(null, { title_es: 'No Org' }))
        .rejects.toThrow('Se requiere organization_id para crear una receta de organización.');
    });
  });

  describe('updateNutriRecipe', () => {
    it('should successfully update recipe belonging to same organization', async () => {
      const mockRecipe = {
        id: '1',
        organization_id: 'org-123',
        update: vi.fn().mockResolvedValue(true)
      };
      Recipe.findByPk.mockResolvedValue(mockRecipe);

      const result = await NutriRecipeService.updateNutriRecipe('1', 'org-123', { title_es: 'Nuevo' });

      expect(mockRecipe.update).toHaveBeenCalledWith({
        title_es: 'Nuevo',
        organization_id: 'org-123'
      });
      expect(RecipeProvider.clearCache).toHaveBeenCalled();
      expect(result).toBe(mockRecipe);
    });

    it('should fail if recipe is global or belongs to another organization', async () => {
      const mockRecipe = {
        id: '1',
        organization_id: null
      };
      Recipe.findByPk.mockResolvedValue(mockRecipe);

      await expect(NutriRecipeService.updateNutriRecipe('1', 'org-123', { title_es: 'Nuevo' }))
        .rejects.toThrow('Receta no encontrada o no autorizada.');
    });
  });

  describe('deleteNutriRecipe', () => {
    it('should successfully delete recipe belonging to same organization', async () => {
      const mockRecipe = {
        id: '1',
        organization_id: 'org-123',
        destroy: vi.fn().mockResolvedValue(true)
      };
      Recipe.findByPk.mockResolvedValue(mockRecipe);

      const result = await NutriRecipeService.deleteNutriRecipe('1', 'org-123');

      expect(mockRecipe.destroy).toHaveBeenCalled();
      expect(RecipeProvider.clearCache).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Receta de organización eliminada correctamente' });
    });
  });
});
