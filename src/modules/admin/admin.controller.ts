import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { sendSuccess } from '../../utils/response';
import {
  AddVenueForOwnerInput,
  CreateOwnerInput,
  GetOwnersQuery,
  UpdateOwnerStatusInput,
  UpdateOwnerSubscriptionInput,
} from './admin.schema';

export class AdminController {
  static async getOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as GetOwnersQuery;
      const result = await AdminService.getOwners(query);
      return sendSuccess(res, result.owners, 200, 'تم استرجاع قائمة أصحاب الملاعب بنجاح', result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getOwnerById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const details = await AdminService.getOwnerById(id);
      return sendSuccess(res, details, 200, 'تم استرجاع تفاصيل صاحب الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async createOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as CreateOwnerInput;
      const adminId = req.user?.userId || 'ADMIN';
      const result = await AdminService.createOwner(body, adminId);
      return sendSuccess(res, result, 201, 'تم إنشاء وتفعيل حساب صاحب الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateOwnerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body as UpdateOwnerStatusInput;
      const adminId = req.user?.userId || 'ADMIN';
      const result = await AdminService.updateOwnerStatus(id, status, adminId);
      return sendSuccess(res, result, 200, `تم تحديث حالة الحساب إلى ${status} بنجاح`);
    } catch (error) {
      next(error);
    }
  }

  static async updateOwnerSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const body = req.body as UpdateOwnerSubscriptionInput;
      const adminId = req.user?.userId || 'ADMIN';
      const result = await AdminService.updateOwnerSubscription(id, body, adminId);
      return sendSuccess(res, result, 200, 'تم تحديث اشتراك صاحب الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async addVenueForOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const { ownerId } = req.params;
      const body = req.body as AddVenueForOwnerInput;
      const adminId = req.user?.userId || 'ADMIN';
      const venue = await AdminService.addVenueForOwner(ownerId, body, adminId);
      return sendSuccess(res, venue, 201, 'تم إضافة الملعب للمالك بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AnalyticsService.getAdminDashboard();
      return sendSuccess(res, stats, 200, 'تم استرجاع إحصائيات لوحة التحكم بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

