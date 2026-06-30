import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockClose = vi.fn().mockResolvedValue(undefined);
const mockInfo = vi.fn();
const mockError = vi.fn();

vi.mock('bullmq', () => {
  const MockQueue = vi.fn(function (_name, _opts) {
    this.close = mockClose;
  });
  return { Queue: MockQueue };
});

vi.mock('../config/bullmq.js', () => ({
  createBullMQConnection: vi.fn(() => 'mock-ioredis-connection'),
  QUEUE_NAMES: { AI_JOBS: 'ai-jobs' },
}));

vi.mock('../services/ActivityLogger.js', () => ({
  ActivityLogger: {
    info: (...args) => mockInfo(...args),
    error: (...args) => mockError(...args),
    warn: vi.fn(),
  }
}));

// ── Tests ───────────────────────────────────────────────────────────────────

describe('queues/aiQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getAiQueue', () => {
    it('should create a Queue with the ai-jobs name', async () => {
      const { getAiQueue } = await import('../queues/aiQueue.js');
      const { Queue } = await import('bullmq');

      getAiQueue();

      expect(Queue).toHaveBeenCalledOnce();
      expect(Queue.mock.calls[0][0]).toBe('ai-jobs');
    });

    it('should return the same singleton on subsequent calls', async () => {
      const { getAiQueue } = await import('../queues/aiQueue.js');
      const { Queue } = await import('bullmq');

      const q1 = getAiQueue();
      const q2 = getAiQueue();

      expect(q1).toBe(q2);
      expect(Queue).toHaveBeenCalledOnce();
    });

    it('should configure default job options with 3 attempts and exponential backoff', async () => {
      const { getAiQueue } = await import('../queues/aiQueue.js');
      const { Queue } = await import('bullmq');

      getAiQueue();

      const opts = Queue.mock.calls[0][1].defaultJobOptions;
      expect(opts.attempts).toBe(3);
      expect(opts.backoff).toEqual({ type: 'exponential', delay: 2000 });
    });

    it('should configure removeOnComplete with age=3600 and count=200', async () => {
      const { getAiQueue } = await import('../queues/aiQueue.js');
      const { Queue } = await import('bullmq');

      getAiQueue();

      const opts = Queue.mock.calls[0][1].defaultJobOptions;
      expect(opts.removeOnComplete).toEqual({ age: 3600, count: 200 });
    });

    it('should configure removeOnFail with age=86400 (24 hours)', async () => {
      const { getAiQueue } = await import('../queues/aiQueue.js');
      const { Queue } = await import('bullmq');

      getAiQueue();

      const opts = Queue.mock.calls[0][1].defaultJobOptions;
      expect(opts.removeOnFail).toEqual({ age: 86400 });
    });

    it('should log initialization via ActivityLogger', async () => {
      const { getAiQueue } = await import('../queues/aiQueue.js');

      getAiQueue();

      // mockInfo is a stable vi.fn() that persists across resetModules
      expect(mockInfo).toHaveBeenCalledWith('[BullMQ] AI Queue initialized.');
    });

    it('should throw and log error if Queue constructor fails', async () => {
      const { Queue } = await import('bullmq');
      Queue.mockImplementationOnce(function () { throw new Error('Redis down'); });

      const { getAiQueue } = await import('../queues/aiQueue.js');

      expect(() => getAiQueue()).toThrow('Redis down');
      expect(mockError).toHaveBeenCalled();
    });
  });

  describe('closeAiQueue', () => {
    it('should call queue.close() and reset the singleton', async () => {
      const { getAiQueue, closeAiQueue } = await import('../queues/aiQueue.js');
      const { Queue } = await import('bullmq');

      getAiQueue();
      expect(Queue).toHaveBeenCalledOnce();

      await closeAiQueue();
      expect(mockClose).toHaveBeenCalledOnce();

      getAiQueue();
      expect(Queue).toHaveBeenCalledTimes(2);
    });

    it('should do nothing if no queue exists', async () => {
      const { closeAiQueue } = await import('../queues/aiQueue.js');

      await closeAiQueue();
      expect(mockClose).not.toHaveBeenCalled();
    });
  });
});
