import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DietPlanService } from '../services/DietPlanService.js';
import { NutritionalPlan } from '../models/NutritionalPlan.js';
import { User } from '../models/User.js';
import { Recipe } from '../models/Recipe.js';

vi.mock('../models/NutritionalPlan.js', () => ({
  NutritionalPlan: {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn()
  }
}));

vi.mock('../models/User.js', () => ({
  User: {
    findByPk: vi.fn(),
    findAll: vi.fn()
  }
}));

vi.mock('../models/Recipe.js', () => ({
  Recipe: {
    findAll: vi.fn()
  }
}));

describe('DietPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPlan', () => {
    it('should throw error if patient does not exist', async () => {
      User.findByPk.mockResolvedValue(null);

      await expect(DietPlanService.createPlan({ patient_id: 'p-1' }, 'creator-1', 'org-1'))
        .rejects.toThrow('El paciente especificado no existe.');
    });

    it('should throw error if dates overlap', async () => {
      User.findByPk.mockResolvedValue({ id: 'p-1' });
      NutritionalPlan.findOne.mockResolvedValue({
        id: 'existing-plan',
        start_date: '2026-05-19',
        end_date: '2026-05-25'
      });

      const planData = {
        patient_id: 'p-1',
        title: 'Nuevo Plan',
        start_date: '2026-05-20',
        end_date: '2026-05-27'
      };

      await expect(DietPlanService.createPlan(planData, 'creator-1', 'org-1'))
        .rejects.toThrow('El paciente ya tiene un plan alimentario asignado entre 2026-05-19 y 2026-05-25.');
    });

    it('should successfully create plan when validation passes', async () => {
      User.findByPk.mockResolvedValue({ id: 'p-1' });
      NutritionalPlan.findOne.mockResolvedValue(null);
      
      const planData = {
        patient_id: 'p-1',
        title: 'Nuevo Plan',
        start_date: '2026-05-28',
        end_date: '2026-06-03',
        meals: [],
        notes: 'notes'
      };

      const createdPlan = { id: 'plan-123', ...planData };
      NutritionalPlan.create.mockResolvedValue(createdPlan);

      const result = await DietPlanService.createPlan(planData, 'creator-1', 'org-1');

      expect(NutritionalPlan.create).toHaveBeenCalledWith({
        patient_id: 'p-1',
        organization_id: 'org-1',
        created_by: 'creator-1',
        title: 'Nuevo Plan',
        start_date: '2026-05-28',
        end_date: '2026-06-03',
        meals: [],
        notes: 'notes'
      });
      expect(result).toBe(createdPlan);
    });
  });

  describe('getActivePlanForPatient', () => {
    it('should return null if no active plan exists', async () => {
      NutritionalPlan.findOne.mockResolvedValue(null);

      const result = await DietPlanService.getActivePlanForPatient('patient-1');

      expect(result).toBeNull();
    });

    it('should return active plan and populate recipes inside meals', async () => {
      const mockMeals = [
        {
          day: 'Monday',
          meals: [
            { type: 'breakfast', recipeId: 'r-1', notes: 'tomar frio' },
            { type: 'lunch', recipeId: 'r-2' }
          ]
        }
      ];

      const mockPlan = {
        id: 'plan-1',
        title: 'Mi plan activo',
        start_date: '2026-05-19',
        end_date: '2026-05-25',
        meals: mockMeals,
        notes: 'general notes',
        created_at: new Date(),
        updated_at: new Date()
      };

      NutritionalPlan.findOne.mockResolvedValue(mockPlan);
      Recipe.findAll.mockResolvedValue([
        { id: 'r-1', title_es: 'Desayuno SIBO', toJSON: () => ({ id: 'r-1', title_es: 'Desayuno SIBO' }) },
        { id: 'r-2', title_es: 'Almuerzo SIBO', toJSON: () => ({ id: 'r-2', title_es: 'Almuerzo SIBO' }) }
      ]);

      const result = await DietPlanService.getActivePlanForPatient('patient-1');

      expect(Recipe.findAll).toHaveBeenCalledWith(expect.objectContaining({
        attributes: ['id', 'title_es', 'title_en', 'slug', 'image_url', 'difficulty', 'prep_time_minutes']
      }));
      expect(result.meals[0].meals[0].recipe).toEqual({ id: 'r-1', title_es: 'Desayuno SIBO' });
      expect(result.meals[0].meals[1].recipe).toEqual({ id: 'r-2', title_es: 'Almuerzo SIBO' });
    });
  });

  describe('getUniquePatients', () => {
    it('should retrieve list of unique patients with plans', async () => {
      NutritionalPlan.findAll.mockResolvedValue([
        { patient_id: 'p-1' },
        { patient_id: 'p-2' }
      ]);
      User.findAll.mockResolvedValue([
        { id: 'p-1', display_name: 'Patient 1', email: 'p1@test.com' },
        { id: 'p-2', display_name: 'Patient 2', email: 'p2@test.com' }
      ]);

      const result = await DietPlanService.getUniquePatients('creator-1', 'org-1');

      expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
        attributes: ['id', 'display_name', 'email']
      }));
      expect(result).toHaveLength(2);
    });
  });
});
