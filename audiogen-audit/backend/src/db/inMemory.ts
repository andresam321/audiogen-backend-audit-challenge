import type { User, Subscription, Job, UsageRecord } from '../types/index.js';

export const users: Map<string, User> = new Map([
  [
    'user-1',
    {
      id: 'user-1',
      email: 'alice@example.com',
      passwordHash: '$2b$10$KIX8Hj3pQzMvBwnD4eX9OubhzZLQ5J8o3Rgm1Ky7vfUQasWcNpYHi',
      internalScore: 87,
      subscriptionId: 'sub-1',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  [
    'user-2',
    {
      id: 'user-2',
      email: 'bob@example.com',
      passwordHash: '$2b$10$ZvNrX8oLmFpQcKjWd2Y1TuCbhAsMn3Pgk6Rh9Wt4xEqVsBwIaDlGm',
      internalScore: 42,
      subscriptionId: 'sub-2',
      createdAt: '2024-01-15T00:00:00.000Z',
    },
  ],
]);

export const subscriptions: Map<string, Subscription> = new Map([
  [
    'sub-1',
    {
      id: 'sub-1',
      userId: 'user-1',
      plan: 'pro',
      monthlyQuota: 10000,
      renewsAt: '2025-02-01T00:00:00.000Z',
    },
  ],
  [
    'sub-2',
    {
      id: 'sub-2',
      userId: 'user-2',
      plan: 'free',
      monthlyQuota: 1000,
      renewsAt: '2025-02-01T00:00:00.000Z',
    },
  ],
]);

// Starts empty — populated at runtime
export const jobs: Map<string, Job> = new Map();

export const usageRecords: Map<string, UsageRecord> = new Map();
