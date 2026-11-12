import { Router } from 'express';
import { OwnerController } from './owner.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles('VENUE_OWNER', 'ADMIN'));

router.get('/stats', OwnerController.getStats);
router.get('/analytics', OwnerController.getAnalytics);
router.get('/subscription', OwnerController.getSubscription);
router.get('/profile', OwnerController.getProfile);
router.get('/venues', OwnerController.getVenues);

export const ownerRoutes = router;

