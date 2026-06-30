import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminStatsService } from '../services/AdminStatsService.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { FavoriteRecipe } from '../models/FavoriteRecipe.js';

vi.mock('../models/ActivityLog.js', () => ({
  ActivityLog: {
    findAll: vi.fn(),
    count: vi.fn()
  }
}));

vi.mock('../models/FavoriteRecipe.js', () => ({
  FavoriteRecipe: {
    findAll: vi.fn()
  }
}));

describe('AdminStatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminStats', () => {
    it('should query and return consolidated stats', async () => {
      // 1. Mock top searches
      ActivityLog.findAll
        .mockResolvedValueOnce([
          { term: 'sibo', count: 10 },
          { term: 'gluten', count: 5 }
        ]) // top searches
        .mockResolvedValueOnce([
          { term: 'desconocido', count: 2 }
        ]) // failed searches
        .mockResolvedValueOnce([
          { recipe_id: 'recipe-1', title: 'Receta SIBO 1', views: '20' }
        ]) // top viewed
        .mockResolvedValueOnce([
          { day: '2026-05-19', action: 'INGEST_SUCCESS', count: 3 }
        ]); // ingest by day

      // 2. Mock favorite counts
      FavoriteRecipe.findAll.mockResolvedValue([
        { recipe_id: 'recipe-1', fav_count: '2' }
      ]);

      // 3. Mock counts for NVIDIA (success, fail)
      ActivityLog.count
        .mockResolvedValueOnce(95) // success
        .mockResolvedValueOnce(5); // fail

      const stats = await AdminStatsService.getAdminStats();

      // Assertions
      expect(stats.top_searches).toEqual([
        { term: 'sibo', count: 10 },
        { term: 'gluten', count: 5 }
      ]);
      expect(stats.failed_searches).toEqual([
        { term: 'desconocido', count: 2 }
      ]);
      expect(stats.low_conversion_recipes).toEqual([
        {
          recipe_id: 'recipe-1',
          title: 'Receta SIBO 1',
          views: 20,
          favorites: 2,
          conversionRate: 0.1
        }
      ]);
      expect(stats.nvidia).toEqual({
        uptime_percent_24h: 95.0,
        success_24h: 95,
        failures_24h: 5
      });
      expect(stats.ingest_by_day).toEqual([
        { day: '2026-05-19', action: 'INGEST_SUCCESS', count: 3 }
      ]);
    });
  });
});
