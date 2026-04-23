import { randomUUID } from 'crypto';
import { jobs } from '../db/inMemory.js';
import type { Job } from '../types/index.js';
import { trackUsage } from './usageService.js';

/**
 * Creates a new audio processing job.
 *
 * BUG: idempotencyKey is stored on the job but never checked before insertion.
 * Submitting the same idempotencyKey twice produces two distinct jobs and two
 * separate billing events. The fix requires a pre-insert lookup by idempotencyKey.
 */
export function createJob(
  userId: string,
  text: string,
  idempotencyKey?: string,
): Job {
  const now = new Date().toISOString();
  const job: Job = {
    id: randomUUID(),
    userId,
    text,
    status: 'pending',
    characterCount: text.length,
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  return job;
}

export function getJobById(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export function getJobsByUserId(userId: string): Job[] {
  // Scans all jobs — O(n) on the full jobs collection
  return Array.from(jobs.values()).filter((j) => j.userId === userId);
}

/**
 * Simulates async audio generation for a job.
 *
 * BUG: trackUsage is called here after processing completes. The route handler
 * ALSO calls trackUsage immediately after job creation. This causes every job
 * to be billed twice — once at submission, once at completion.
 *
 * Fix: remove the duplicate trackUsage call from either this function or the route.
 */
export async function processJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`[processJob] Job ${jobId} not found — cannot process`);
    return;
  }

  // Transition to processing
  jobs.set(jobId, {
    ...job,
    status: 'processing',
    updatedAt: new Date().toISOString(),
  });

  // Simulate audio generation latency
  await new Promise<void>((resolve) => setTimeout(resolve, 50));

  const current = jobs.get(jobId);
  if (!current) return;

  // Transition to completed
  const completedAt = new Date().toISOString();
  jobs.set(jobId, {
    ...current,
    status: 'completed',
    audioUrl: `https://cdn.audiogen.io/audio/${jobId}.mp3`,
    completedAt,
    updatedAt: completedAt,
  });

  // BUG: usage is also tracked in routes/jobs.ts — this creates a double-count
  trackUsage(job.userId, jobId, job.characterCount);
}
