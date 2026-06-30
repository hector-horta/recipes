import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stable mock fns (survive clearAllMocks) ─────────────────────────────────

const mockGetJob = vi.fn();
const mockGetWaiting = vi.fn().mockResolvedValue([]);
const mockGetActive = vi.fn().mockResolvedValue([]);
const mockGetCompleted = vi.fn().mockResolvedValue([]);
const mockGetFailed = vi.fn().mockResolvedValue([]);

const mockQueue = {
  getJob: (...a) => mockGetJob(...a),
  getWaiting: (...a) => mockGetWaiting(...a),
  getActive: (...a) => mockGetActive(...a),
  getCompleted: (...a) => mockGetCompleted(...a),
  getFailed: (...a) => mockGetFailed(...a),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockJob(overrides = {}) {
  return {
    id: 'job-1',
    name: 'generate-image',
    progress: 100,
    returnvalue: { imageUrl: '/public/recipes/test.jpg' },
    failedReason: null,
    timestamp: 1716200000000,
    finishedOn: 1716200060000,
    getState: vi.fn().mockResolvedValue('completed'),
    ...overrides,
  };
}

/**
 * Handler logic matching routes/jobs.js GET /:id
 */
async function getJobById(params) {
  const job = await mockQueue.getJob(params.id);

  if (!job) {
    return { status: 404, body: { error: 'Job not found.' } };
  }

  const state = await job.getState();

  return {
    status: 200,
    body: {
      id: job.id,
      name: job.name,
      status: state,
      progress: job.progress,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn || null,
    }
  };
}

/**
 * Handler logic matching routes/jobs.js GET /
 */
async function getJobsList() {
  const [waiting, active, completed, failed] = await Promise.all([
    mockQueue.getWaiting(0, 10),
    mockQueue.getActive(0, 10),
    mockQueue.getCompleted(0, 10),
    mockQueue.getFailed(0, 10),
  ]);

  const formatJob = (job, status) => ({
    id: job.id,
    name: job.name,
    status,
    progress: job.progress,
    result: job.returnvalue || null,
    failedReason: job.failedReason || null,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn || null,
  });

  const jobs = [
    ...active.map(j => formatJob(j, 'active')),
    ...waiting.map(j => formatJob(j, 'waiting')),
    ...completed.map(j => formatJob(j, 'completed')),
    ...failed.map(j => formatJob(j, 'failed')),
  ];

  return {
    status: 200,
    body: {
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
      jobs,
    }
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('routes/jobs — handler logic', () => {
  beforeEach(() => {
    mockGetJob.mockReset();
    mockGetWaiting.mockReset().mockResolvedValue([]);
    mockGetActive.mockReset().mockResolvedValue([]);
    mockGetCompleted.mockReset().mockResolvedValue([]);
    mockGetFailed.mockReset().mockResolvedValue([]);
  });

  describe('GET /jobs/:id', () => {
    it('should return 404 when job is not found', async () => {
      mockGetJob.mockResolvedValue(null);

      const res = await getJobById({ id: 'nonexistent-id' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found.');
    });

    it('should return job status with all fields when job exists', async () => {
      const mockJob = createMockJob();
      mockGetJob.mockResolvedValue(mockJob);

      const res = await getJobById({ id: 'job-1' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 'job-1',
        name: 'generate-image',
        status: 'completed',
        progress: 100,
        result: { imageUrl: '/public/recipes/test.jpg' },
        failedReason: null,
        timestamp: 1716200000000,
        finishedOn: 1716200060000,
      });
    });

    it('should return null result when job has no returnvalue', async () => {
      const mockJob = createMockJob({ returnvalue: null });
      mockGetJob.mockResolvedValue(mockJob);

      const res = await getJobById({ id: 'job-1' });

      expect(res.body.result).toBeNull();
    });

    it('should include failedReason when job has failed', async () => {
      const mockJob = createMockJob({
        returnvalue: null,
        failedReason: 'API timeout',
        finishedOn: null,
      });
      mockJob.getState.mockResolvedValue('failed');
      mockGetJob.mockResolvedValue(mockJob);

      const res = await getJobById({ id: 'job-1' });

      expect(res.body.status).toBe('failed');
      expect(res.body.failedReason).toBe('API timeout');
      expect(res.body.finishedOn).toBeNull();
    });
  });

  describe('GET /jobs', () => {
    it('should return counts and formatted jobs array', async () => {
      const activeJob = createMockJob({ id: 'a1', progress: 50 });
      const completedJob = createMockJob({ id: 'c1' });

      mockGetActive.mockResolvedValue([activeJob]);
      mockGetCompleted.mockResolvedValue([completedJob]);

      const res = await getJobsList();

      expect(res.body.counts).toEqual({
        waiting: 0,
        active: 1,
        completed: 1,
        failed: 0,
      });
      expect(res.body.jobs).toHaveLength(2);
    });

    it('should correctly categorize jobs by status', async () => {
      const waitingJob = createMockJob({ id: 'w1', name: 'ingest-text' });
      const failedJob = createMockJob({ id: 'f1', failedReason: 'error' });

      mockGetWaiting.mockResolvedValue([waitingJob]);
      mockGetFailed.mockResolvedValue([failedJob]);

      const res = await getJobsList();

      const statuses = res.body.jobs.map(j => j.status);
      expect(statuses).toContain('waiting');
      expect(statuses).toContain('failed');
    });

    it('should return empty state when no jobs exist', async () => {
      const res = await getJobsList();

      expect(res.body.counts).toEqual({ waiting: 0, active: 0, completed: 0, failed: 0 });
      expect(res.body.jobs).toEqual([]);
    });

    it('should order active → waiting → completed → failed', async () => {
      mockGetActive.mockResolvedValue([createMockJob({ id: 'a1' })]);
      mockGetWaiting.mockResolvedValue([createMockJob({ id: 'w1' })]);
      mockGetCompleted.mockResolvedValue([createMockJob({ id: 'c1' })]);
      mockGetFailed.mockResolvedValue([createMockJob({ id: 'f1' })]);

      const res = await getJobsList();

      const ids = res.body.jobs.map(j => j.id);
      expect(ids).toEqual(['a1', 'w1', 'c1', 'f1']);
    });
  });
});
