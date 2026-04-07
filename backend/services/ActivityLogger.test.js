import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityLogger } from './ActivityLogger.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { SearchLog } from '../models/SearchLog.js';

vi.mock('../models/ActivityLog.js', () => ({
  ActivityLog: {
    create: vi.fn()
  }
}));

vi.mock('../models/SearchLog.js', () => ({
  SearchLog: {
    create: vi.fn()
  }
}));

describe('ActivityLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = '';
    process.env.TELEGRAM_USER_ID = '';
  });

  describe('log', () => {
    it('should log activity to database', () => {
      ActivityLogger.log('SEARCH', { query: 'pasta' }, { userId: 'user-123', ip: '127.0.0.1' });

      expect(ActivityLog.create).toHaveBeenCalledWith({
        action: 'SEARCH',
        metadata: { query: 'pasta' },
        failed_search: false,
        user_id: 'user-123',
        ip: '127.0.0.1'
      });
    });

    it('should default options when not provided', () => {
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

    it('should not create SearchLog when search is successful', () => {
      ActivityLogger.log('SEARCH', { query: 'found' }, { failedSearch: false });

      expect(SearchLog.create).not.toHaveBeenCalled();
    });

    it('should handle database write errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (ActivityLog.create as any).mockRejectedValue(new Error('DB error'));

      expect(() => {
        ActivityLogger.log('TEST', {});
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('sendTelegramAlert', () => {
    it('should skip if Telegram credentials not configured', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await ActivityLogger.sendTelegramAlert('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActivityLogger] Telegram credentials not configured, skipping alert.'
      );
      consoleSpy.mockRestore();
    });

    it('should send alert when credentials are configured', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_USER_ID = '123';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ''
      });
      global.fetch = mockFetch;

      await ActivityLogger.sendTelegramAlert('Alert message');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '123',
            text: 'Alert message',
            parse_mode: 'Markdown'
          })
        })
      );
    });

    it('should handle Telegram API errors', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_USER_ID = '123';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      await ActivityLogger.sendTelegramAlert('Test');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActivityLogger] Telegram API error (400):',
        'Bad Request'
      );
      consoleSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_USER_ID = '123';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await ActivityLogger.sendTelegramAlert('Test');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ActivityLogger] Telegram fetch failed:',
        'Network error'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('alertAsync', () => {
    it('should call sendTelegramAlert without blocking', () => {
      const sendSpy = vi.spyOn(ActivityLogger, 'sendTelegramAlert').mockResolvedValue();
      
      expect(() => {
        ActivityLogger.alertAsync('Async alert');
      }).not.toThrow();

      expect(sendSpy).toHaveBeenCalledWith('Async alert');
      sendSpy.mockRestore();
    });

    it('should catch errors silently', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const sendSpy = vi.spyOn(ActivityLogger, 'sendTelegramAlert').mockRejectedValue(new Error('Fail'));

      ActivityLogger.alertAsync('Test');
      
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Async alert failed:')
      );

      consoleSpy.mockRestore();
      sendSpy.mockRestore();
    });
  });
});
