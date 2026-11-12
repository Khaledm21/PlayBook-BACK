import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/users.routes';
import { venueRoutes } from './modules/venues/venues.routes';
import { pitchRoutes } from './modules/pitches/pitches.routes';
import { bookingRoutes } from './modules/bookings/bookings.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { subscriptionRoutes } from './modules/subscriptions/subscriptions.routes';
import { reviewRoutes } from './modules/reviews/reviews.routes';
import { notificationRoutes } from './modules/notifications/notifications.routes';
import { auditLogRoutes } from './modules/audit_logs/audit_logs.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { ownerRoutes } from './modules/owner/owner.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/venues', venueRoutes);
router.use('/pitches', pitchRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/admin', adminRoutes);
router.use('/owner', ownerRoutes);

export default router;

