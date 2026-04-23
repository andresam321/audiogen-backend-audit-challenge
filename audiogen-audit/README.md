# AudioGen — Backend Audit Assessment
A real-world backend debugging challenge inspired by production issues in AI processing systems.
## Overview

You've been handed the backend codebase for **AudioGen**, an AI text-to-speech platform. Users submit text, asynchronous jobs are created and processed, usage is tracked against monthly subscription quotas, and customers are billed per character.

The previous engineering team shipped this under time pressure. Production reports have flagged several categories of bugs. Your job is to **audit the code, identify root causes, and apply minimal surgical fixes**.

**Time budget:** 60–90 minutes

---

## Setup

```bash
pnpm install
pnpm dev      # starts backend (port 3001) and frontend (port 5173) concurrently
pnpm test     # runs the backend test suite
```

Seed users are pre-loaded:
- `user-1` — Pro plan (10,000 char/month)
- `user-2` — Free plan (1,000 char/month)

---

## Known Problem Areas

The following categories of issues have been reported. Root causes are **not** provided.

### 1. Duplicate Job Submissions
Users report that network retries occasionally create multiple billable jobs for identical content. An idempotency mechanism appears to exist in the schema but may not be enforced.

### 2. Incorrect Usage Tracking
The billing team has confirmed that some users are being charged double their actual usage. The issue is consistently reproducible but the source has not been pinpointed — it could be the API layer, the job processor, or an interaction between both.

### 3. Inconsistent API Responses
The frontend team filed a bug saying the job list endpoint returns data in an unexpected shape. Single-job lookups work correctly. There may be a naming inconsistency between endpoints that predates the current team.

### 4. Quota Enforcement Gap
Users on the Free plan have reported submitting jobs that push them over their monthly limit without receiving an error. The quota check logic may have an off-by-one or missing condition.

### 5. Performance Degradation at Scale
Internal load testing shows API latency increasing linearly with a user's job history. Profiling points to the usage calculation path.

### 6. Sensitive Data Exposure
A security audit flagged that at least one endpoint may be returning fields that should never leave the server boundary.

---

## Architecture

```
backend/src/
├── db/           # In-memory store + seed data (users, subscriptions, jobs, usage)
├── middleware/   # Request logging, centralised error handling
├── routes/       # Express handlers — jobs.ts, users.ts
├── services/     # Business logic — jobService, usageService, subscriptionService
├── types/        # Shared TypeScript interfaces
└── validation/   # Input validation

frontend/src/
└── main.tsx      # React single-page dashboard
```

## API Reference

| Method | Path                 | Description                        |
|--------|----------------------|------------------------------------|
| GET    | /health              | Liveness check                     |
| POST   | /api/jobs            | Create an audio processing job     |
| GET    | /api/jobs/:id        | Get a single job by ID             |
| GET    | /api/jobs?userId=    | List all jobs for a user           |
| GET    | /api/users/:id       | User profile with subscription & usage |

---

## Candidate Notes

- Focus on **root causes**, not symptoms — fix the source, not the side effect
- Bugs intentionally span multiple files — cross-reference before concluding
- Some test failures may be **misleading** — read the test expectation against the actual implementation carefully
- Changes should be **surgical** — resist the urge to refactor broadly
- At least one failing test describes correct expected behaviour from the wrong layer of the stack

## Open Practice Repository

This repository is open for anyone to use.

If you're preparing for backend or full-stack engineering interviews, feel free to clone this project and use it as a debugging and code auditing exercise.

### Tech Stack

* Backend: Node.js, Express, TypeScript
* Frontend: React (Vite), TypeScript
* Testing: Vitest/Jest
* Data Layer: In-memory store (simulating production systems)

### How to Use

* Run the project locally
* Execute the test suite
* Identify failing behaviors
* Trace issues across services, routes, and state
* Apply minimal fixes

This project is designed to simulate real-world debugging scenarios, not toy problems.
