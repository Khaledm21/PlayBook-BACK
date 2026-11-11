import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { AuthUser } from '../types/express';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    throw new UnauthorizedError('رمز التوثيق مفقود، يرجى تسجيل الدخول أولاً');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError('صيغة رمز التوثيق غير صحيحة، يجب أن تكون Bearer <Token>');
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('انتهت صلاحية رمز التوثيق، يرجى استخدام Refresh Token لتجديده');
    }
    throw new UnauthorizedError('رمز التوثيق غير صالح أو تم التلاعب به');
  }
};

export const requireRoles = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('غير مصرح بالدخول، لم يتم التحقق من الهوية');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `صلاحيات غير كافية: يتطلب هذا الإجراء أحد الأدوار التالية (${roles.join(', ')})`
      );
    }

    next();
  };
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const decoded = jwt.verify(parts[1], env.JWT_ACCESS_SECRET) as JwtPayload;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
      };
    } catch {
      // Ignored for optional auth
    }
  }
  next();
};

