import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../middleware/errorHandler.js';
import { ZodError } from 'zod';

let mockNodeEnv = 'development';

vi.mock('../../config/env.js', () => ({
  config: {
    get NODE_ENV() { return mockNodeEnv; }
  }
}));

vi.mock('../../services/ActivityLogger.js', () => ({
  ActivityLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    alertAsync: vi.fn()
  }
}));

describe('errorHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    mockNodeEnv = 'development';
    req = {
      method: 'GET',
      url: '/test-route',
      ip: '127.0.0.1',
      user: null
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should return full Zod error details in development mode', () => {
    const issues = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['email'],
        message: 'Email is required'
      }
    ];
    const zodError = new ZodError(issues);

    errorHandler(zodError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: issues
      })
    );
  });

  it('should mask Zod error details to field/message format in production mode', () => {
    mockNodeEnv = 'production';
    const issues = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['nested', 'field'],
        message: 'Field is required'
      }
    ];
    const zodError = new ZodError(issues);

    errorHandler(zodError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: [
          {
            field: 'nested.field',
            message: 'Field is required'
          }
        ]
      })
    );
  });
});
