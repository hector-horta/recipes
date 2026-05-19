import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IngredientConsolidatorService } from '../services/IngredientConsolidatorService.js';
import { NutritionalPlan } from '../models/NutritionalPlan.js';
import { Recipe } from '../models/Recipe.js';
import { Ingredient } from '../models/Ingredient.js';
import { User } from '../models/User.js';

vi.mock('../models/NutritionalPlan.js', () => ({
  NutritionalPlan: {
    findAll: vi.fn()
  }
}));

vi.mock('../models/Recipe.js', () => ({
  Recipe: {
    findAll: vi.fn()
  }
}));

describe('IngredientConsolidatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consolidateIngredients', () => {
    it('should return empty lists if patientIds is empty', async () => {
      const result = await IngredientConsolidatorService.consolidateIngredients([]);
      expect(result.success).toBe(true);
      expect(result.patients).toHaveLength(0);
      expect(result.ingredients).toHaveLength(0);
    });

    it('should return empty list if no active plans are found', async () => {
      NutritionalPlan.findAll.mockResolvedValue([]);

      const result = await IngredientConsolidatorService.consolidateIngredients(['user-uuid-1']);
      expect(result.success).toBe(true);
      expect(result.patients).toHaveLength(0);
      expect(result.ingredients).toHaveLength(0);
      expect(result.message).toContain('No se encontraron planes nutricionales');
    });

    it('should consolidate ingredients summing quantities by portion factors', async () => {
      const mockPatient = {
        id: 'patient-1',
        display_name: 'Jane Doe',
        email: 'jane@test.com'
      };

      const mockPlan = {
        id: 'plan-1',
        title: 'Plan Test',
        patient: mockPatient,
        meals: [
          {
            day: 'Monday',
            meals: [
              { type: 'lunch', recipeId: 'recipe-1' },
              { type: 'dinner', recipeId: 'recipe-2' }
            ]
          },
          {
            day: 'Tuesday',
            meals: [
              { type: 'lunch', recipeId: 'recipe-1' } // recipe-1 appears 2 times total
            ]
          }
        ]
      };

      NutritionalPlan.findAll.mockResolvedValue([mockPlan]);

      // recipe-1: servings = 2. ingredient = "pollo" (quantity = 200g base)
      // For 2 occurrences, portion factor is 2 / 2 = 1.0. Total pollo should be 200g.
      // recipe-2: servings = 1. ingredient = "pollo" (quantity = 100g base)
      // For 1 occurrence, portion factor is 1 / 1 = 1.0. Total pollo should be 100g.
      // Summed total pollo: 200 + 100 = 300g.
      const mockRecipe1 = {
        id: 'recipe-1',
        servings: 2,
        recipeIngredients: [
          {
            id: 'ing-1',
            name_es: 'Pollo',
            name_en: 'Chicken',
            RecipeIngredient: {
              quantity: '200',
              quantity_numeric: 200.0,
              unit_es: 'g',
              unit_en: 'g',
              sibo_alert: false
            }
          }
        ]
      };

      const mockRecipe2 = {
        id: 'recipe-2',
        servings: 1,
        recipeIngredients: [
          {
            id: 'ing-1',
            name_es: 'Pollo',
            name_en: 'Chicken',
            RecipeIngredient: {
              quantity: '100',
              quantity_numeric: 100.0,
              unit_es: 'g',
              unit_en: 'g',
              sibo_alert: true // One of them triggers SIBO alert
            }
          }
        ]
      };

      Recipe.findAll.mockResolvedValue([mockRecipe1, mockRecipe2]);

      const result = await IngredientConsolidatorService.consolidateIngredients(['patient-1']);

      expect(result.success).toBe(true);
      expect(result.patients).toHaveLength(1);
      expect(result.patients[0].displayName).toBe('Jane Doe');
      
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].nameEs).toBe('Pollo');
      expect(result.ingredients[0].quantity).toBe('300'); // (200 / 2 * 2) + (100 / 1 * 1) = 300
      expect(result.ingredients[0].siboAlert).toBe(true); // Propagated from recipe-2
    });

    it('should join text quantities if they are not numeric', async () => {
      const mockPlan = {
        id: 'plan-1',
        title: 'Plan Test',
        patient: { id: 'patient-1', display_name: 'Jane Doe', email: 'jane@test.com' },
        meals: [
          {
            day: 'Monday',
            meals: [{ type: 'lunch', recipeId: 'recipe-1' }]
          }
        ]
      };

      NutritionalPlan.findAll.mockResolvedValue([mockPlan]);

      const mockRecipe = {
        id: 'recipe-1',
        servings: 1,
        recipeIngredients: [
          {
            id: 'ing-2',
            name_es: 'Sal',
            name_en: 'Salt',
            RecipeIngredient: {
              quantity: 'una pizca',
              quantity_numeric: null,
              unit_es: '',
              unit_en: '',
              sibo_alert: false
            }
          }
        ]
      };

      Recipe.findAll.mockResolvedValue([mockRecipe]);

      const result = await IngredientConsolidatorService.consolidateIngredients(['patient-1']);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0].nameEs).toBe('Sal');
      expect(result.ingredients[0].quantity).toBe('una pizca');
    });
  });
});
