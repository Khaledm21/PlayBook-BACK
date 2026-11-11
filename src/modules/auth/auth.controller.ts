import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { LoginInput, RefreshTokenInput, RegisterInput } from './auth.schema';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await AuthService.register(req.body as RegisterInput, ip, userAgent);

      return sendSuccess(res, result, 201, 'تم إنشاء الحساب بنجاح، مرحباً بك في PlayBook');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await AuthService.login(req.body as LoginInput, ip, userAgent);

      return sendSuccess(res, result, 200, 'تم تسجيل الدخول بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const tokens = await AuthService.refreshToken(refreshToken);

      return sendSuccess(res, tokens, 200, 'تم تجديد الرمز بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.userId;
      await AuthService.logout(refreshToken, userId);

      return sendSuccess(res, { success: true }, 200, 'تم تسجيل الخروج بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await AuthService.getMe(userId);

      return sendSuccess(res, user, 200, 'تم استرجاع بيانات الحساب بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

