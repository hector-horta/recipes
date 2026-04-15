import { ActivityLog } from '../../models/ActivityLog.js';
import { SearchLog } from '../../models/SearchLog.js';

/**
 * DatabaseAdapter — Persiste eventos en la base de datos SQL.
 */
export class DatabaseAdapter {
  constructor() {
    this.name = 'DatabaseAdapter';
  }

  async process(action, metadata = {}, options = {}) {
    const { userId = null, ip = null, failedSearch = false } = options;

    try {
      await ActivityLog.create({
        action,
        metadata,
        failed_search: failedSearch,
        user_id: userId,
        ip
      });

      // Special handling for legacy search_logs table
      if (failedSearch && metadata.query) {
        await SearchLog.create({
          term: metadata.query,
          status: 'failed',
          conversion: false,
          user_id: userId,
          ip
        });
      } else if (action === 'SUGGEST_TO_CHEF' && metadata.term) {
        await SearchLog.create({
          term: metadata.term,
          status: 'suggested',
          conversion: true,
          user_id: userId,
          ip
        });
      }
    } catch (err) {
      console.error(`[ActivityLogger] [${this.name}] Failed to save log (${action}):`, err.message);
    }
  }
}
