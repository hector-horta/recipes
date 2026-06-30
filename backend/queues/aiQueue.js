import { Queue } from 'bullmq';
import { createBullMQConnection, QUEUE_NAMES } from '../config/bullmq.js';
import { ActivityLogger } from '../services/ActivityLogger.js';

/**
 * AI Jobs Queue — used by the Express server to enqueue heavy AI tasks.
 *
 * Usage:
 *   import { aiQueue } from './queues/aiQueue.js';
 *   const job = await aiQueue.add('generate-image', { recipeId, title, feedback });
 *   res.status(202).json({ jobId: job.id });
 */

let _queue = null;

export function getAiQueue() {
  if (!_queue) {
    try {
      _queue = new Queue(QUEUE_NAMES.AI_JOBS, {
        connection: createBullMQConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600,      // Keep completed jobs for 1 hour
            count: 200,     // Keep last 200 completed jobs
          },
          removeOnFail: {
            age: 86400,     // Keep failed jobs for 24 hours
          },
        },
      });

      ActivityLogger.info('[BullMQ] AI Queue initialized.');
    } catch (error) {
      ActivityLogger.error('[BullMQ] Failed to initialize AI Queue:', error);
      throw error;
    }
  }

  return _queue;
}

/**
 * Gracefully close the queue connection.
 */
export async function closeAiQueue() {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
