import { Router } from 'express';
import { AdminController } from './admin.controller';
import { SubscriptionController } from '../subscriptions/subscriptions.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  addVenueForOwnerSchema,
  createOwnerSchema,
  getOwnersQuerySchema,
  ownerIdParamSchema,
  updateOwnerStatusSchema,
  updateOwnerSubscriptionSchema,
} from './admin.schema';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticateToken);
router.use(requireRoles('ADMIN'));

// Owners Management
router.get(
  '/owners',
  validate({ query: getOwnersQuerySchema }),
  AdminController.getOwners
);

router.get(
  '/owners/:id',
  validate({ params: ownerIdParamSchema }),
  AdminController.getOwnerById
);

router.post(
  '/owners',
  validate({ body: createOwnerSchema }),
  AdminController.createOwner
);

router.patch(
  '/owners/:id/status',
  validate({ params: ownerIdParamSchema, body: updateOwnerStatusSchema }),
  AdminController.updateOwnerStatus
);

router.patch(
  '/owners/:id/subscription',
  validate({ params: ownerIdParamSchema, body: updateOwnerSubscriptionSchema }),
  AdminController.updateOwnerSubscription
);

router.post(
  '/owners/:ownerId/venues',
  validate({ body: addVenueForOwnerSchema }),
  AdminController.addVenueForOwner
);

// Plans endpoint (fallback /admin/plans)
router.get('/plans', SubscriptionController.getPlans);

// Stats & Analytics
router.get('/stats', AdminController.getStats);
router.get('/analytics', AdminController.getStats);

export const adminRoutes = router;

