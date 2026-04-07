import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recoveryLogger, saveIngestLog } from './recoveryLogger.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  }
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/'))
  },
  join: vi.fn((...args) => args.join('/'))
}));

describe('recoveryLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('recoveryLogger middleware', () => {
    it('should log successful recipe responses', () => {
      const mockNext = vi.fn();
      const mockJson = vi.fn();
      
      const req = {};
      const res = {
        json: mockJson,
        statusCode: 200
      };

      recoveryLogger(req, res, mockNext);

      const resultBody = { recipe: { slug: 'test-recipe', title: 'Test' } };
      res.json(resultBody);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(resultBody);
    });

    it('should not log non-2xx responses', () => {
      const mockNext = vi.fn();
      const mockJson = vi.fn();
      
      const req = {};
      const res = {
        json: mockJson,
        statusCode: 400
      };

      recoveryLogger(req, res, mockNext);
      res.json({ error: 'Bad request' });

      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ error: 'Bad request' });
    });

    it('should not log responses without recipe', () => {
      const mockNext = vi.fn();
      const mockJson = vi.fn();
      
      const req = {};
      const res = {
        json: mockJson,
        statusCode: 200
      };

      recoveryLogger(req, res, mockNext);
      res.json({ message: 'Success' });

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle write errors gracefully', () => {
      const mockNext = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => { throw new Error('Write error'); });
      
      const req = {};
      const res = {
        json: vi.fn(),
        statusCode: 200
      };

      recoveryLogger(req, res, mockNext);
      res.json({ recipe: { slug: 'test' } });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write')
      );
      consoleSpy.mockRestore();
    });

    it('should call next middleware', () => {
      const mockNext = vi.fn();
      const req = {};
      const res = { json: vi.fn(), statusCode: 200 };

      recoveryLogger(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should generate filename from date and slug', () => {
      const mockNext = vi.fn();
      const mockJson = vi.fn();
      
      const req = {};
      const res = {
        json: mockJson,
        statusCode: 200
      };

      recoveryLogger(req, res, mockNext);
      res.json({ recipe: { slug: 'my-recipe' } });

      const writtenContent = fs.writeFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('my-recipe');
    });
  });

  describe('saveIngestLog', () => {
    it('should save recipe data to file', () => {
      const recipeData = {
        slug: 'test-slug',
        title: 'Test Recipe',
        ingredients: []
      };

      saveIngestLog(recipeData);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const content = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(content.slug).toBe('test-slug');
    });

    it('should use title as fallback when slug not available', () => {
      const recipeData = {
        title: 'Untitled Recipe'
      };

      saveIngestLog(recipeData);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle write errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => { throw new Error('Disk full'); });

      expect(() => saveIngestLog({ slug: 'test' })).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write')
      );
      consoleSpy.mockRestore();
    });

    it('should prettify JSON output', () => {
      const recipeData = { slug: 'test', simple: true };

      saveIngestLog(recipeData);

      const content = fs.writeFileSync.mock.calls[0][1];
      expect(content).toContain('  ');
    });
  });
});
