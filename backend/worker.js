#!/usr/bin/env node

/**
 * AI Worker Process
 * ─────────────────
 * Standalone entry point: `node worker.js`
 *
 * Consumes the 'ai-jobs' BullMQ queue and processes heavy AI tasks
 * (image generation, recipe ingest) off the main Express event loop.
 *
 * This keeps the API server responsive even when AI providers are slow
 * or rate-limited.
 */

import { Worker } from 'bullmq';
import { createBullMQConnection, QUEUE_NAMES } from './config/bullmq.js';
import { config } from './config/env.js';
import { ActivityLogger } from './services/ActivityLogger.js';
import { processJob } from './services/workerHandlers.js';

// ── Database connection (needed to persist results) ─────────────────────────
import { connectDB, sequelize } from './config/database.js';


// ── Startup ─────────────────────────────────────────────────────────────────

async function main() {
  // Connect to database
  await connectDB();
  await sequelize.sync();

  ActivityLogger.info('[Worker] Database connected.');

  // Create the worker
  const worker = new Worker(
    QUEUE_NAMES.AI_JOBS,
    processJob,
    {
      connection: createBullMQConnection(),
      concurrency: 2,          // Process up to 2 AI jobs in parallel
      limiter: {
        max: 5,                // Max 5 jobs per 60 seconds
        duration: 60_000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    ActivityLogger.info(`[Worker] Job ${job.id} (${job.name}) completed.`, {
      result: typeof result === 'object' ? JSON.stringify(result).substring(0, 200) : result,
    });
  });

  worker.on('failed', (job, error) => {
    ActivityLogger.error(`[Worker] Job ${job?.id} (${job?.name}) failed.`, {
      error: error.message,
      attempt: job?.attemptsMade,
    });
  });

  worker.on('error', (error) => {
    ActivityLogger.error('[Worker] Worker error:', { error: error.message });
  });

  ActivityLogger.info('[Worker] AI Worker is running. Waiting for jobs...');

  // ── Graceful shutdown ───────────────────────────────────────────────────

  const shutdown = async (signal) => {
    ActivityLogger.info(`[Worker] Received ${signal}. Shutting down gracefully...`);

    // Stop taking new jobs and wait for current ones to finish (5s max)
    await worker.close();
    ActivityLogger.info('[Worker] Worker closed.');

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  ActivityLogger.error('[Worker] Fatal startup error:', { error: error.message });
  process.exit(1);
});
