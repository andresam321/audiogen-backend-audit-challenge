import { Router } from 'express';
import type { Request, Response } from 'express';
import { createJob, getJobById, getJobsByUserId, processJob } from '../services/jobService.js';
import { checkQuota } from '../services/subscriptionService.js';
import { trackUsage } from '../services/usageService.js';
import { validateJobCreate } from '../validation/jobValidation.js';

const router = Router();

/**
 * POST /api/jobs
 * Submit text for async audio generation.
 *
 * Known issues:
 *   - BUG: trackUsage is called here AND inside processJob → double billing
 *   - BUG: Returns HTTP 200 instead of 201 on successful resource creation
 *   - BUG: idempotencyKey is forwarded to createJob but never deduplicated
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { userId, text, idempotencyKey } = req.body as {
    userId?: string;
    text?: string;
    idempotencyKey?: string;
  };

  const validationError = validateJobCreate({ userId, text, idempotencyKey });
  if (validationError) {
    res.status(400).json({ success: false, error: validationError });
    return;
  }

  const quotaCheck = checkQuota(userId as string, (text as string).length);
  if (!quotaCheck.allowed) {
    res.status(429).json({
      success: false,
      error: 'Monthly quota exceeded. Upgrade your plan to continue.',
      remaining: quotaCheck.remaining,
    });
    return;
  }

  const job = createJob(userId as string, text as string, idempotencyKey);

  // BUG: usage is tracked here at submission time …
  trackUsage(userId as string, job.id, job.characterCount);

  // … and again inside processJob when the job completes → double-count
  processJob(job.id).catch((err: Error) => {
    console.error(`[jobs] Background processing failed for ${job.id}:`, err.message);
  });

  // BUG: 200 instead of 201 for newly created resource
  res.status(200).json({ success: true, data: job });
});

/**
 * GET /api/jobs/:id
 * Fetch a single job by ID. Returns shape: { success, data: Job }
 */
router.get('/:id', (req: Request, res: Response): void => {
  const job = getJobById(req.params.id);

  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  res.status(200).json({ success: true, data: job });
});

/**
 * GET /api/jobs?userId=xxx
 * List all jobs for a user.
 *
 * BUG: Returns { success, jobs: Job[] } — note the key is `jobs`, not `data`.
 * The single-job endpoint uses `data`. The frontend expects `results`.
 * All three names are in play across the codebase.
 */
router.get('/', (req: Request, res: Response): void => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ success: false, error: 'userId query parameter is required' });
    return;
  }

  const userJobs = getJobsByUserId(userId);

  // Inconsistent key: single job uses `data`, list uses `jobs`
  res.status(200).json({ success: true, jobs: userJobs });
});

export default router;
