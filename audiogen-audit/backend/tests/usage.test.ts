import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { jobs, usageRecords } from '../src/db/inMemory.js';
import { getCurrentUsage } from '../src/services/usageService.js';
import { trackUsage } from '../src/services/usageService.js';

beforeEach(() => {
  jobs.clear();
  usageRecords.clear();
});

describe('Usage tracking', () => {
  /**
   * FAILING TEST — Usage is counted twice per job.
   *
   * When a job is submitted, trackUsage() is called in the POST /api/jobs
   * route handler. When the job finishes processing, processJob() calls
   * trackUsage() a second time. Each job therefore bills the user for 2x
   * its actual character count.
   *
   * This test submits an 11-character job and expects usage = 11.
   * It will observe usage = 22.
   */
  it('records usage exactly once after a job is submitted and processed', async () => {
    const text = 'Hello world'; // 11 characters

    await request(app).post('/api/jobs').send({ userId: 'user-1', text });

    // Allow async processJob to complete (has 50 ms internal delay)
    await new Promise((resolve) => setTimeout(resolve, 200));

    const usage = getCurrentUsage('user-1');

    expect(usage).toBe(text.length); // FAILS: actual value is 22 (double-counted)
  });

  /**
   * FAILING TEST — Usage accumulates at 2× the real rate.
   *
   * Two jobs totalling 300 characters should produce usage = 300.
   * Due to double-counting the actual recorded usage will be 600.
   */
  it('accumulates usage correctly across multiple jobs for the same user', async () => {
    await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-2', text: 'A'.repeat(100) });
    await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-2', text: 'B'.repeat(200) });

    await new Promise((resolve) => setTimeout(resolve, 300));

    const usage = getCurrentUsage('user-2');

    expect(usage).toBe(300); // FAILS: actual is 600
  });

  it('getCurrentUsage returns 0 for a user with no records', () => {
    const usage = getCurrentUsage('user-1');
    expect(usage).toBe(0);
  });

  it('trackUsage creates a persisted record with correct fields', () => {
    const record = trackUsage('user-1', 'job-xyz', 150);

    expect(record.id).toBeTruthy();
    expect(record.userId).toBe('user-1');
    expect(record.jobId).toBe('job-xyz');
    expect(record.characters).toBe(150);
    expect(record.recordedAt).toBeTruthy();

    // Confirm it's actually stored
    const total = getCurrentUsage('user-1');
    expect(total).toBe(150);
  });

  it('usage is isolated between users', () => {
    trackUsage('user-1', 'j1', 500);
    trackUsage('user-2', 'j2', 250);

    expect(getCurrentUsage('user-1')).toBe(500);
    expect(getCurrentUsage('user-2')).toBe(250);
  });
});
