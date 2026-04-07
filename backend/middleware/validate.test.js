import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateQuery } from './validate.js';
import { z } from 'zod';

const testSchema = z.object({
  query: z.string().optional(),
  number: z.string().regex(/^\d+$/).optional(),
  limit: z.number().max(100).optional()
});

describe('validate middleware', () => {
  describe('validateQuery', () => {
    it('should parse valid query and call next', () => {
      const req = { query: { query: 'pasta', number: '5' } };
      const res = {};
      const next = vi.fn();

      const middleware = validateQuery(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validatedQuery).toEqual({ query: 'pasta', number: '5' });
    });

    it('should return 400 on validation error', () => {
      const req = { query: { number: 'invalid' } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = validateQuery(testSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Petición malformada.',
        details: expect.arrayContaining([expect.any(String)])
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass non-Zod errors to next', () => {
      const badSchema = z.object({
        test: z.string().transform(() => { throw new Error('Transform error'); })
      });
      
      const req = { query: { test: 'value' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      const middleware = validateQuery(badSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle empty query object', () => {
      const req = { query: {} };
      const res = {};
      const next = vi.fn();

      const middleware = validateQuery(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({});
    });

    it('should validate multiple fields', () => {
      const req = { query: { query: 'test', number: '10', limit: '50' } };
      const res = {};
      const next = vi.fn();

      const schema = z.object({
        query: z.string().optional(),
        number: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional()
      });

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedQuery).toEqual({
        query: 'test',
        number: '10',
        limit: '50'
      });
    });

    it('should reject strings that are too long', () => {
      const schema = z.object({
        query: z.string().max(5)
      });
      
      const req = { query: { query: 'verylongquery' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
