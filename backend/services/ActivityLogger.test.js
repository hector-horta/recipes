import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityLogger } from './ActivityLogger.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { SearchLog } from '../models/SearchLog.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../models/ActivityLog.js', () => ({
  ActivityLog: {
    create: vi.fn(() => Promise.resolve({}))
  }
}));

vi.mock('../models/SearchLog.js', () => ({
  SearchLog: {
    create: vi.fn(() => Promise.resolve({}))
  }
}));

vi.mock('../config/env.js', () => ({
  config: {
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_USER_ID: ''
  }
}));

describe('ActivityLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should call ActivityLog.create with correct params', () => {
      ActivityLogger.log('SEARCH', { query: 'pasta' }, { userId: 'user-123', ip: '127.0.0.1' });

      expect(ActivityLog.create).toHaveBeenCalledWith({
        action: 'SEARCH',
        metadata: { query: 'pasta' },
        failed_search: false,
        user_id: 'user-123',
        ip: '127.0.0.1'
      });
    });

    it('should work without options', () => {
      ActivityLogger.log('VIEW_RECIPE', { recipeId: 'r1' });

      expect(ActivityLog.create).toHaveBeenCalledWith({
        action: 'VIEW_RECIPE',
        metadata: { recipeId: 'r1' },
        failed_search: false,
        user_id: null,
        ip: null
      });
    });

    it('should create SearchLog when failedSearch is true', () => {
      ActivityLogger.log('SEARCH', { query: 'notfound' }, { failedSearch: true, userId: 'u1' });

      expect(SearchLog.create).toHaveBeenCalledWith({
        term: 'notfound',
        status: 'failed',
        conversion: false,
        user_id: 'u1',
        ip: null
      });
    });
  });

  describe('sendTelegramAlert', () => {
    it('should skip when credentials not configured', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await ActivityLogger.sendTelegramAlert('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActivityLogger] Telegram credentials not configured, skipping alert.'
      );
      consoleSpy.mockRestore();
    });

    it('should be callable without crashing', async () => {
      const result = await ActivityLogger.sendTelegramAlert('Test');
      expect(result).toBeUndefined();
    });
  });

  describe('alertAsync', () => {
    it('should be callable without crashing', async () => {
      await ActivityLogger.alertAsync('Test alert');
    });
  });
});