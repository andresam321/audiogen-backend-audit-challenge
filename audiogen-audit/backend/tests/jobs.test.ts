import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { jobs, usageRecords } from '../src/db/inMemory.js';

beforeEach(() => {
  jobs.clear();
  usageRecords.clear();
});

// ---------------------------------------------------------------------------
// Job creation
// ---------------------------------------------------------------------------

describe('POST /api/jobs — creation', () => {
  it('creates a job and returns the job object', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-1', text: 'Hello world' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.characterCount).toBe(11);
    expect(res.body.data.userId).toBe('user-1');
  });

  it('returns 400 when text is missing', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ text: 'some text to process' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for empty text', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-1', text: '   ' });

    expect(res.status).toBe(400);
  });

  /**
   * FAILING TEST — Idempotency is not implemented.
   *
   * When the same idempotencyKey is submitted twice (e.g. due to a network
   * retry), the server should recognise the duplicate and return the original
   * job rather than creating a second one.
   *
   * Currently createJob() ignores the idempotencyKey during insertion, so two
   * distinct jobs — and two billing events — are created.
   */
  it('returns the original job when idempotencyKey is reused', async () => {
    const payload = {
      userId: 'user-1',
      text: 'Convert this text please',
      idempotencyKey: 'client-req-abc-001',
    };

    const first = await request(app).post('/api/jobs').send(payload);
    const second = await request(app).post('/api/jobs').send(payload);

    expect(first.body.data.id).toBe(second.body.data.id); // FAILS: two different IDs
  });
});

// ---------------------------------------------------------------------------
// Job retrieval — single
// ---------------------------------------------------------------------------

describe('GET /api/jobs/:id', () => {
  it('returns a job by id', async () => {
    const create = await request(app)
      .post('/api/jobs')
      .send({ userId: 'user-1', text: 'Retrieve me' });

    const jobId = create.body.data.id as string;

    const get = await request(app).get(`/api/jobs/${jobId}`);

    expect(get.status).toBe(200);
    expect(get.body.success).toBe(true);
    expect(get.body.data.id).toBe(jobId);
    expect(get.body.data.text).toBe('Retrieve me');
  });

  it('returns 404 for an unknown job id', async () => {
    const res = await request(app).get('/api/jobs/does-not-exist-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Job listing
// ---------------------------------------------------------------------------

describe('GET /api/jobs — list', () => {
  /**
   * FAILING TEST — Misleading description, real issue is an API contract bug.
   *
   * The frontend team raised a ticket saying "job list returns wrong shape".
   * They assumed the field would be `results` (matching an older API version).
   * The actual field returned is `jobs`, but the single-job endpoint uses `data`.
   *
   * The real root cause is not the field name per se — it's that the two
   * endpoints are inconsistent with each other, which means any client has to
   * special-case both. The fix is to align both endpoints to use `data`.
   *
   * Candidates who immediately rename `results` → `jobs` have found a symptom
   * but not the root cause.
   */
  it('job list response has a `results` field matching the frontend contract', async () => {
    await request(app).post('/api/jobs').send({ userId: 'user-1', text: 'First job' });
    await request(app).post('/api/jobs').send({ userId: 'user-1', text: 'Second job' });

    const res = await request(app).get('/api/jobs?userId=user-1');

    expect(res.status).toBe(200);
    expect(res.body.results).toBeDefined();          // FAILS: field is `jobs`, not `results`
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(2);
  });

  it('returns 400 when userId query param is absent', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(400);
  });

  it('returns an empty array when the user has no jobs', async () => {
    const res = await request(app).get('/api/jobs?userId=user-1');
    expect(res.status).toBe(200);
    // NOTE: this passes because `res.body.jobs` exists and is [] — but the
    //       test above shows the field name disagreement with the frontend
    expect(res.body.jobs).toHaveLength(0);
  });
});
