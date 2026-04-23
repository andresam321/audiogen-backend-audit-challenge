import { randomUUID } from 'crypto';
import { usageRecords } from '../db/inMemory.js';
import type { UsageRecord } from '../types/index.js';

/**
 * Returns the total characters consumed by a user this billing period.
 *
 * NOTE: This performs a full scan of all usage records on every call.
 * For users with large histories this becomes O(n) per request.
 */
export function getCurrentUsage(userId: string): number {
  let total = 0;
  for (const record of usageRecords.values()) {
    if (record.userId === userId) {
      total += record.characters;
    }
  }
  return total;
}

export function trackUsage(
  userId: string,
  jobId: string,
  characters: number,
): UsageRecord {
  const record: UsageRecord = {
    id: randomUUID(),
    userId,
    jobId,
    characters,
    recordedAt: new Date().toISOString(),
  };
  usageRecords.set(record.id, record);
  return record;
}

export function getUserUsageRecords(userId: string): UsageRecord[] {
  return Array.from(usageRecords.values()).filter((r) => r.userId === userId);
}
