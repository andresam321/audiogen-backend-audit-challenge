import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { jobs, usageRecords } from '../src/db/inMemory.js';
import { checkQuota } from '../src/services/subscriptionService.js';
import { trackUsage } from '../src/services/usageService.js';

beforeEach(() => {
  jobs.clear();
  usageRecords.clear();
});

describe('Subscription quota enforcement', () => {
  it('allows a job that is within the free plan quota', async () => {
    // user-2 is on the free plan: 1,000 char quota, 0 usage so far
    const res = await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-2', text: 'A'.repeat(500) });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns quota metadata from checkQuota for a fresh user', () => {
    // user-1: pro plan, 10,000 quota, no usage yet
    const result = checkQuota('user-1', 500);

    expect(result.allowed).toBe(true);
    expect(result.quota).toBe(10_000);
    expect(result.currentUsage).toBe(0);
    expect(result.remaining).toBe(10_000);
  });

  /**
   * FAILING TEST — Quota gate does not account for the incoming request size.
   *
   * user-2 is on the free plan (1,000 chars/month). We manually record 950
   * characters of prior usage, then attempt to create a 100-character job.
   * 950 + 100 = 1,050 which exceeds the quota — the request should be rejected
   * with HTTP 429.
   *
   * The current checkQuota() implementation checks:
   *   allowed = currentUsage < monthlyQuota  →  950 < 1000  →  true
   *
   * It never considers `requestedCharacters`, so the job is allowed through and
   * the user ends up 50 characters over their plan limit.
   */
  it('rejects a job whose characters would push usage over the quota', async () => {
    // Simulate 950 chars already consumed this month
    trackUsage('user-2', 'historical-job-1', 950);

    const res = await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-2', text: 'A'.repeat(100) }); // 950 + 100 = 1,050 > 1,000

    expect(res.status).toBe(429); // FAILS: returns 200 because 950 < 1000
  });

  it('returns 429 when usage has already reached the quota ceiling', async () => {
    // Consume the entire free quota
    trackUsage('user-2', 'historical-job-2', 1000);

    const res = await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-2', text: 'one more' });

    // This passes because 1000 is NOT < 1000, so allowed = false
    expect(res.status).toBe(429);
  });

  /**
   * FAILING TEST — Security: user endpoint exposes sensitive internal fields.
   *
   * The GET /api/users/:id response spreads the full User record, which includes
   * `passwordHash` and `internalScore`. These must never be returned to clients.
   *
   * This test asserts the expected secure behaviour (fields absent).
   * It fails because the bug causes them to be present.
   */
  it('does not expose passwordHash or internalScore in the user profile response', async () => {
    const res = await request(app).get('/api/users/user-1');

    expect(res.status).toBe(200);
    expect(res.body.data.passwordHash).toBeUndefined(); // FAILS: field is present
    expect(res.body.data.internalScore).toBeUndefined(); // FAILS: field is present
  });
});
