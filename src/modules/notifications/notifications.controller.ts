import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notifications.service';
import { sendSuccess } from '../../utils/response';
import { GetNotificationsQuery } from './notifications.schema';

export class NotificationController {
  static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const query = req.query as unknown as GetNotificationsQuery;
      const result = await NotificationService.getUserNotifications(userId, query);

      return sendSuccess(
        res,
        {
          notifications: result.notifications,
          unreadCount: result.unreadCount,
        },
        200,
        'تم استرجاع الإشعارات بنجاح',
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updated = await NotificationService.markAsRead(id, userId);

      return sendSuccess(res, updated, 200, 'تم تعيين الإشعار كمقروء');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await NotificationService.markAllAsRead(userId);

      return sendSuccess(res, { success: true }, 200, 'تم تعيين جميع الإشعارات كمقروءة');
    } catch (error) {
      next(error);
    }
  }
}

