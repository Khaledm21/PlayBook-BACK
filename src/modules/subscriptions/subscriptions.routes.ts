import { Router } from 'express';
import { SubscriptionController } from './subscriptions.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  subscribeSchema,
  subscriptionIdParamSchema,
  updateSubscriptionStatusSchema,
} from './subscriptions.schema';

const router = Router();

// Public: view plans
router.get('/plans', SubscriptionController.getPlans);

// Venue Owner
router.get(
  '/my',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  SubscriptionController.getMySubscription
);

router.post(
  '/subscribe',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ body: subscribeSchema }),
  SubscriptionController.subscribe
);

// Admin
router.get(
  '/',
  authenticateToken,
  requireRoles('ADMIN'),
  SubscriptionController.getAllSubscriptions
);

router.patch(
  '/:id/status',
  authenticateToken,
  requireRoles('ADMIN'),
  validate({ params: subscriptionIdParamSchema, body: updateSubscriptionStatusSchema }),
  SubscriptionController.updateStatus
);

export const subscriptionRoutes = router;

