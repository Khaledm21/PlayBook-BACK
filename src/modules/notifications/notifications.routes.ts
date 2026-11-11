import { Router } from 'express';
import { NotificationController } from './notifications.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
} from './notifications.schema';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  validate({ query: getNotificationsQuerySchema }),
  NotificationController.getMyNotifications
);

router.patch(
  '/read-all',
  NotificationController.markAllAsRead
);

router.patch(
  '/:id/read',
  validate({ params: notificationIdParamSchema }),
  NotificationController.markAsRead
);

export const notificationRoutes = router;

