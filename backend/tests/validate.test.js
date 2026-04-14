import { describe, it, expect, vi } from 'vitest';
import { validateQuery } from '../middleware/validate';
import { recipeQuerySchema } from '../models/validators';

describe('Validation Middleware & Schemas', () => {
  it('recipeQuerySchema validates correct parameters', () => {
    const validQuery = {
      query: 'pasta',
      excludeIngredients: 'tomato',
      diet: 'vegan',
      number: '5',
      sort: 'healthiness'
    };
    const result = recipeQuerySchema.safeParse(validQuery);
    expect(result.success).toBe(true);
  });

  it('recipeQuerySchema rejects invalid number type', () => {
    const invalidQuery = {
      number: 'not-a-number'
    };
    const result = recipeQuerySchema.safeParse(invalidQuery);
    expect(result.success).toBe(false);
  });

  it('validateQuery middleware passes ZodError to next() on bad data', () => {
    const req = { query: { number: 'invalid' } };
    const res = {};
    const next = vi.fn();

    const middleware = validateQuery(recipeQuerySchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    const error = next.mock.calls[0][0];
    expect(error.name).toBe('ZodError');
  });

  it('validateQuery middleware calls next on good data', () => {
    const req = { query: { query: 'chicken' } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    const middleware = validateQuery(recipeQuerySchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validatedQuery).toBeDefined();
    expect(req.validatedQuery.query).toBe('chicken');
  });
});
