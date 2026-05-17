import { describe, it, expect } from 'vitest';
import { 
  recipeQuerySchema, 
  addOrgUserSchema, 
  bulkOrgUsersSchema, 
  organizationUpdateSchema 
} from '../../models/validators.js';

describe('validators', () => {
  describe('recipeQuerySchema', () => {
    it('should validate empty query object', () => {
      const result = recipeQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate valid query parameters', () => {
      const validQuery = {
        query: 'pasta',
        excludeIngredients: 'tomato,onion',
        diet: 'vegan',
        number: '10',
        sort: 'healthiness'
      };

      const result = recipeQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject query that is too long', () => {
      const longQuery = {
        query: 'a'.repeat(101)
      };

      const result = recipeQuerySchema.safeParse(longQuery);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('max 100 caracteres');
    });

    it('should reject excludeIngredients that is too long', () => {
      const longIngredients = {
        excludeIngredients: 'a'.repeat(501)
      };

      const result = recipeQuerySchema.safeParse(longIngredients);
      expect(result.success).toBe(false);
    });

    it('should reject diet that is too long', () => {
      const longDiet = {
        diet: 'a'.repeat(51)
      };

      const result = recipeQuerySchema.safeParse(longDiet);
      expect(result.success).toBe(false);
    });

    it('should reject invalid number format', () => {
      const invalidNumber = {
        number: 'not-a-number'
      };

      const result = recipeQuerySchema.safeParse(invalidNumber);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('entero válido');
    });

    it('should accept valid number', () => {
      const validNumber = {
        number: '25'
      };

      const result = recipeQuerySchema.safeParse(validNumber);
      expect(result.success).toBe(true);
    });

    it('should reject invalid sort format', () => {
      const longSort = {
        sort: 'a'.repeat(51)
      };

      const result = recipeQuerySchema.safeParse(longSort);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from query', () => {
      const query = {
        query: '  pasta  '
      };

      const result = recipeQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('pasta');
      }
    });

    it('should handle partial validation', () => {
      const partial = {
        query: 'test',
        invalidField: 'should be ignored'
      };

      const result = recipeQuerySchema.safeParse(partial);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('test');
        expect(result.data).not.toHaveProperty('invalidField');
      }
    });

    it('should validate all fields together', () => {
      const complete = {
        query: 'chicken',
        excludeIngredients: 'garlic',
        diet: 'keto',
        number: '5',
        sort: 'relevance'
      };

      const result = recipeQuerySchema.safeParse(complete);
      expect(result.success).toBe(true);
    });
  });

  describe('addOrgUserSchema', () => {
    it('should validate valid user with default role', () => {
      const result = addOrgUserSchema.safeParse({
        displayName: 'John Doe',
        email: 'john@example.com'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('user');
      }
    });

    it('should validate valid admin user', () => {
      const result = addOrgUserSchema.safeParse({
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        role: 'admin'
      });
      expect(result.success).toBe(true);
    });

    it('should reject display name that is too short', () => {
      const result = addOrgUserSchema.safeParse({
        displayName: 'A',
        email: 'john@example.com'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = addOrgUserSchema.safeParse({
        displayName: 'John Doe',
        email: 'invalid-email'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = addOrgUserSchema.safeParse({
        displayName: 'John Doe',
        email: 'john@example.com',
        role: 'superadmin'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bulkOrgUsersSchema', () => {
    it('should validate a valid array of users', () => {
      const result = bulkOrgUsersSchema.safeParse({
        users: [
          { displayName: 'John Doe', email: 'john@example.com' },
          { displayName: 'Jane Doe', email: 'jane@example.com', role: 'admin' }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should reject an empty array of users', () => {
      const result = bulkOrgUsersSchema.safeParse({
        users: []
      });
      expect(result.success).toBe(false);
    });

    it('should reject an array exceeding 500 users', () => {
      const users = Array.from({ length: 501 }, (_, i) => ({
        displayName: `User ${i}`,
        email: `user${i}@example.com`
      }));
      const result = bulkOrgUsersSchema.safeParse({ users });
      expect(result.success).toBe(false);
    });
  });

  describe('organizationUpdateSchema', () => {
    it('should validate valid update with active status', () => {
      const result = organizationUpdateSchema.safeParse({
        name: 'NutriCorp',
        slug: 'nutricorp',
        is_active: true
      });
      expect(result.success).toBe(true);
    });

    it('should validate valid update without status', () => {
      const result = organizationUpdateSchema.safeParse({
        name: 'NutriCorp',
        slug: 'nutricorp'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug format', () => {
      const result = organizationUpdateSchema.safeParse({
        name: 'NutriCorp',
        slug: 'Nutri Corp'
      });
      expect(result.success).toBe(false);
    });
  });
});
