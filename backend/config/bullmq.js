import IORedis from 'ioredis';
import { config } from './env.js';

/**
 * BullMQ requires ioredis (not the 'redis' npm package).
 * This module provides a shared connection factory and queue name constants.
 */

// Parse the REDIS_URL into ioredis-compatible options.
// Default: redis://redis:6379 (docker-compose) or redis://localhost:6379 (local dev).
const REDIS_URL = config.REDIS_URL || 'redis://redis:6379';

/**
 * Creates a new IORedis connection for BullMQ.
 * Each Queue / Worker / QueueEvents needs its own connection instance.
 */
export function createBullMQConnection() {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,   // Required by BullMQ
    enableReadyCheck: false,      // Faster startup
    retryStrategy(times) {
      const delay = Math.min(times * 500, 5000);
      return delay;
    }
  });
}

/**
 * Queue name constants — single source of truth.
 */
export const QUEUE_NAMES = {
  AI_JOBS: 'ai-jobs',
};

/**
 * Job type constants.
 */
export const JOB_TYPES = {
  GENERATE_IMAGE:  'generate-image',
  INGEST_IMAGE:    'ingest-image',
  INGEST_IMAGES:   'ingest-images',
  INGEST_TEXT:     'ingest-text',
  INGEST_AUDIO:    'ingest-audio',
};
