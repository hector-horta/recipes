import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagService } from '../services/TagService.js';
import { Tag } from '../models/Tag.js';
import { redisClient } from '../config/redis.js';

vi.mock('../models/Tag.js', () => ({
  Tag: {
    findAll: vi.fn(),
    bulkCreate: vi.fn()
  }
}));

vi.mock('../config/redis.js', () => ({
  redisClient: {
    isReady: true,
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn()
  }
}));

vi.mock('../services/ActivityLogger.js', () => ({
    ActivityLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('TagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisClient.isReady = true;
  });

  describe('getAllTags', () => {
    it('should return tags from Redis if available', async () => {
      const mockTags = [{ key: 'test', es: 'Prueba', en: 'Test' }];
      redisClient.get.mockResolvedValue(JSON.stringify(mockTags));

      const result = await TagService.getAllTags();

      expect(result).toEqual(mockTags);
      expect(redisClient.get).toHaveBeenCalledWith('tags:all');
      expect(Tag.findAll).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if Redis is empty', async () => {
      const mockTags = [{ key: 'test', es: 'Prueba', en: 'Test' }];
      redisClient.get.mockResolvedValue(null);
      Tag.findAll.mockResolvedValue(mockTags.map(t => ({ get: () => t }))); // Sequelize returns instances

      const result = await TagService.getAllTags();

      expect(result).toEqual(mockTags);
      expect(Tag.findAll).toHaveBeenCalled();
      expect(redisClient.setEx).toHaveBeenCalledWith('tags:all', 86400, JSON.stringify(mockTags));
    });

    it('should fallback to DB if Redis is not ready', async () => {
      redisClient.isReady = false;
      const mockTags = [{ key: 'test', es: 'Prueba', en: 'Test' }];
      Tag.findAll.mockResolvedValue(mockTags.map(t => ({ get: () => t })));

      const result = await TagService.getAllTags();

      expect(result).toEqual(mockTags);
      expect(redisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('upsertTags', () => {
    it('should bulk upsert tags and invalidate cache', async () => {
      const newTags = [{ es: 'Nueva', en: 'New' }];
      
      await TagService.upsertTags(newTags);

      expect(Tag.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'nueva', es: 'Nueva', en: 'New' })
        ]),
        { updateOnDuplicate: ['es', 'en', 'updated_at'] }
      );
      expect(redisClient.del).toHaveBeenCalledWith('tags:all');
    });

    it('should skip invalid tags', async () => {
      const invalidTags = [{ es: '', en: 'Only En' }, null];
      
      await TagService.upsertTags(invalidTags);

      expect(Tag.bulkCreate).not.toHaveBeenCalled();
    });
  });
});
