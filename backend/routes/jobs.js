import express from 'express';
import { getAiQueue } from '../queues/aiQueue.js';
import { optionalAuthenticateToken, checkRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * GET /jobs/:id
 * Returns the current status and result of an AI job.
 *
 * Response shape:
 *   { id, name, status, progress, result, failedReason, timestamp, finishedOn }
 *
 * Status values: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown'
 */
router.get('/:id', optionalAuthenticateToken, checkRole(['admin', 'super_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const queue = getAiQueue();
  const job = await queue.getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  const state = await job.getState();

  res.json({
    id: job.id,
    name: job.name,
    status: state,
    progress: job.progress,
    result: job.returnvalue || null,
    failedReason: job.failedReason || null,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn || null,
  });
}));

/**
 * GET /jobs
 * Lists recent jobs (last 20 completed + active + waiting).
 */
router.get('/', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const queue = getAiQueue();

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaiting(0, 10),
    queue.getActive(0, 10),
    queue.getCompleted(0, 10),
    queue.getFailed(0, 10),
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

  res.json({
    counts: {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    },
    jobs,
  });
}));

export default router;
