import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

let capturedUrl, capturedOpts;

vi.mock('ioredis', () => {
  const MockIORedis = vi.fn(function (url, opts) {
    capturedUrl = url;
    capturedOpts = opts;
  });
  return { default: MockIORedis };
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('config/bullmq', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedUrl = null;
    capturedOpts = null;
  });

  describe('createBullMQConnection', () => {
    it('should create an IORedis instance and pass URL + options', async () => {
      const { createBullMQConnection } = await import('../config/bullmq.js');
      const conn = createBullMQConnection();

      expect(conn).toBeDefined();
      // The URL comes from config.REDIS_URL (or .env fallback)
      // We verify it is a valid redis URL string
      expect(typeof capturedUrl).toBe('string');
      expect(capturedUrl).toMatch(/^redis:\/\//);
    });

    it('should set maxRetriesPerRequest to null (required by BullMQ)', async () => {
      const { createBullMQConnection } = await import('../config/bullmq.js');
      createBullMQConnection();

      expect(capturedOpts.maxRetriesPerRequest).toBeNull();
    });

    it('should disable enableReadyCheck for faster startup', async () => {
      const { createBullMQConnection } = await import('../config/bullmq.js');
      createBullMQConnection();

      expect(capturedOpts.enableReadyCheck).toBe(false);
    });

    it('should implement retryStrategy with exponential backoff capped at 5000ms', async () => {
      const { createBullMQConnection } = await import('../config/bullmq.js');
      createBullMQConnection();

      const { retryStrategy } = capturedOpts;
      expect(retryStrategy).toBeTypeOf('function');

      // Verify exponential growth
      expect(retryStrategy(1)).toBe(500);
      expect(retryStrategy(5)).toBe(2500);

      // Verify cap at 5000ms
      expect(retryStrategy(10)).toBe(5000);
      expect(retryStrategy(100)).toBe(5000);
    });
  });

  describe('QUEUE_NAMES', () => {
    it('should export AI_JOBS queue name', async () => {
      const { QUEUE_NAMES } = await import('../config/bullmq.js');
      expect(QUEUE_NAMES.AI_JOBS).toBe('ai-jobs');
    });
  });

  describe('JOB_TYPES', () => {
    it('should export all 5 job type constants', async () => {
      const { JOB_TYPES } = await import('../config/bullmq.js');

      expect(JOB_TYPES.GENERATE_IMAGE).toBe('generate-image');
      expect(JOB_TYPES.INGEST_IMAGE).toBe('ingest-image');
      expect(JOB_TYPES.INGEST_IMAGES).toBe('ingest-images');
      expect(JOB_TYPES.INGEST_TEXT).toBe('ingest-text');
      expect(JOB_TYPES.INGEST_AUDIO).toBe('ingest-audio');
    });

    it('should have exactly 5 job types', async () => {
      const { JOB_TYPES } = await import('../config/bullmq.js');
      expect(Object.keys(JOB_TYPES)).toHaveLength(5);
    });
  });
});
