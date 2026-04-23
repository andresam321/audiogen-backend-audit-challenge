import { subscriptions } from '../db/inMemory.js';
import type { Subscription } from '../types/index.js';
import { getCurrentUsage } from './usageService.js';

export function getSubscriptionByUserId(userId: string): Subscription | undefined {
  for (const sub of subscriptions.values()) {
    if (sub.userId === userId) return sub;
  }
  return undefined;
}

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  currentUsage: number;
  quota: number;
}

/**
 * Checks whether a user is allowed to submit a new job given their current usage.
 *
 * BUG: The quota gate checks `currentUsage < monthlyQuota` but does NOT factor in
 * the `requestedCharacters` about to be consumed. A user at 950/1000 can still
 * submit a 200-character job because 950 < 1000 evaluates to true.
 *
 * Fix: change the condition to `currentUsage + requestedCharacters <= monthlyQuota`
 */
export function checkQuota(
  userId: string,
  requestedCharacters: number,
): QuotaResult {
  const sub = getSubscriptionByUserId(userId);

  if (!sub) {
    return { allowed: false, remaining: 0, currentUsage: 0, quota: 0 };
  }

  const currentUsage = getCurrentUsage(userId);
  const remaining = sub.monthlyQuota - currentUsage;

  // Intentional bug: ignores requestedCharacters in the gate check
  const allowed = currentUsage < sub.monthlyQuota;

  return {
    allowed,
    remaining,
    currentUsage,
    quota: sub.monthlyQuota,
  };
}
