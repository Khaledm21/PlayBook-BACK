import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from './subscriptions.service';
import { sendSuccess } from '../../utils/response';
import { SubscribeInput } from './subscriptions.schema';

export class SubscriptionController {
  static async getPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await SubscriptionService.getPlans();
      return sendSuccess(res, plans, 200, 'تم استرجاع باقات الاشتراك بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getMySubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const sub = await SubscriptionService.getOwnerSubscription(ownerId);
      return sendSuccess(res, sub, 200, 'تم استرجاع تفاصيل الاشتراك الحالي');
    } catch (error) {
      next(error);
    }
  }

  static async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const body = req.body as SubscribeInput;
      const sub = await SubscriptionService.subscribe(ownerId, body);
      return sendSuccess(res, sub, 200, 'تم الاشتراك في الباقة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getAllSubscriptions(_req: Request, res: Response, next: NextFunction) {
    try {
      const subs = await SubscriptionService.getAllSubscriptions();
      return sendSuccess(res, subs, 200, 'تم استرجاع قائمة الاشتراكات بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user!.userId;
      const updated = await SubscriptionService.updateStatus(id, status, adminId);
      return sendSuccess(res, updated, 200, 'تم تحديث حالة الاشتراك بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

