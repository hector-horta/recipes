import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recoveryLogger } from '../../middleware/recoveryLogger.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('../../services/ActivityLogger.js', () => ({
  ActivityLogger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('recoveryLogger middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      statusCode: 200,
      json: vi.fn()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should call next', () => {
    recoveryLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should intercept res.json and save logs for successful recipe ingest', () => {
    recoveryLogger(req, res, next);
    
    const recipeBody = { recipe: { title: 'Test Recipe', slug: 'test-recipe' } };
    res.json(recipeBody);

    expect(fs.writeFileSync).toHaveBeenCalled();
    const [filepath, content] = vi.mocked(fs.writeFileSync).mock.calls[0];
    expect(filepath).toContain('test-recipe.json');
    expect(JSON.parse(content)).toEqual(recipeBody);
  });

  it('should not save logs if status code is not 2xx', () => {
    res.statusCode = 400;
    recoveryLogger(req, res, next);
    
    res.json({ recipe: { title: 'Failed' } });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should not save logs if body does not contain recipe', () => {
    recoveryLogger(req, res, next);
    
    res.json({ message: 'Success' });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});