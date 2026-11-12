import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../analytics/analytics.service';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { VenueService } from '../venues/venues.service';
import { UserService } from '../users/users.service';
import { sendSuccess } from '../../utils/response';

export class OwnerController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const data = await AnalyticsService.getOwnerDashboard(ownerId);
      return sendSuccess(res, data, 200, 'تم استرجاع إحصائيات المالك بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const data = await AnalyticsService.getOwnerDashboard(ownerId);
      return sendSuccess(res, data, 200, 'تم استرجاع تحليلات الأداء بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const sub = await SubscriptionService.getOwnerSubscription(ownerId);
      const plans = await SubscriptionService.getPlans();
      return sendSuccess(res, { subscription: sub, plans, quota: sub }, 200, 'تم استرجاع تفاصيل الاشتراك بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const [user, sub] = await Promise.all([
        UserService.getUserById(ownerId),
        SubscriptionService.getOwnerSubscription(ownerId),
      ]);
      return sendSuccess(res, { owner: user, quota: sub }, 200, 'تم استرجاع الملف الشخصي وحصة الملاعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const [venues, sub] = await Promise.all([
        VenueService.getOwnerVenues(ownerId),
        SubscriptionService.getOwnerSubscription(ownerId),
      ]);
      return sendSuccess(res, { venues, quota: sub }, 200, 'تم استرجاع ملاعب المالك وحصته بنجاح');
    } catch (error) {
      next(error);
    }
  }
}
