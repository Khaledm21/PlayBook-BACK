import { Request, Response, NextFunction } from 'express';
import { UserService } from './users.service';
import { sendSuccess } from '../../utils/response';
import { GetUsersQuery, UpdateProfileInput } from './users.schema';
import { BadRequestError } from '../../utils/errors';

export class UserController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as GetUsersQuery;
      const result = await UserService.getUsers(query);

      return sendSuccess(res, result.users, 200, 'تم استرجاع قائمة المستخدمين بنجاح', result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);

      return sendSuccess(res, user, 200, 'تم استرجاع بيانات المستخدم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const body = req.body as UpdateProfileInput;
      const updated = await UserService.updateProfile(userId, body);

      return sendSuccess(res, updated, 200, 'تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      if (!req.file) {
        throw new BadRequestError('يرجى اختيار صورة الأفاتار للرفع');
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const updated = await UserService.updateProfile(userId, { avatar: avatarUrl });

      return sendSuccess(res, { avatar: avatarUrl, user: updated }, 200, 'تم رفع صورة الملف الشخصي بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user!.userId;
      const updated = await UserService.updateStatus(id, status, adminId);

      return sendSuccess(res, updated, 200, `تم تغيير حالة المستخدم إلى ${status} بنجاح`);
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminId = req.user!.userId;
      const updated = await UserService.updateRole(id, role, adminId);

      return sendSuccess(res, updated, 200, `تم تغيير دور المستخدم إلى ${role} بنجاح`);
    } catch (error) {
      next(error);
    }
  }
}

