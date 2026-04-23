import { Router } from 'express';
import type { Request, Response } from 'express';
import { users } from '../db/inMemory.js';
import { getSubscriptionByUserId } from '../services/subscriptionService.js';
import { getCurrentUsage, getUserUsageRecords } from '../services/usageService.js';

const router = Router();

/**
 * GET /api/users/:id
 * Returns the user profile, their active subscription, and current usage.
 *
 * BUG: Spreads the full User object into the response, which includes
 * `passwordHash` and `internalScore` — fields that must never leave the server.
 * Fix: explicitly pick only the safe fields before returning.
 */
router.get('/:id', (req: Request, res: Response): void => {
  const user = users.get(req.params.id);

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const subscription = getSubscriptionByUserId(user.id);
  const currentUsage = getCurrentUsage(user.id);
  const recentRecords = getUserUsageRecords(user.id).slice(-10);

  // BUG: `...user` spreads passwordHash and internalScore into the response
  res.status(200).json({
    success: true,
    data: {
      ...user,
      subscription,
      currentUsage,
      recentUsageRecords: recentRecords,
    },
  });
});

export default router;
