import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';
import { LoginInput, RegisterInput } from './auth.schema';
import { AuditLogService } from '../audit_logs/audit_logs.service';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  static generateAccessToken(user: { id: string; email: string; role: string; name: string }) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  static generateRefreshToken(user: { id: string }) {
    return jwt.sign(
      { userId: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );
  }

  static async register(input: RegisterInput, ip?: string, userAgent?: string) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: input.phone },
    });
    if (existingPhone) {
      throw new ConflictError('رقم الهاتف مسجل بالفعل لمستخدم آخر');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash,
        role: input.role,
        city: input.city || null,
        preferredPitchType: input.preferredPitchType || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        city: true,
        status: true,
        preferredPitchType: true,
        createdAt: true,
      },
    });

    // If venue owner, assign basic default free trial subscription
    if (user.role === 'VENUE_OWNER') {
      const basicPlan = await prisma.plan.findUnique({ where: { slug: 'basic' } });
      if (basicPlan) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await prisma.subscription.create({
          data: {
            ownerId: user.id,
            planId: basicPlan.id,
            status: 'ACTIVE',
            expiresAt,
          },
        });
      }
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    await AuditLogService.log({
      userId: user.id,
      action: 'USER_REGISTER',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: ip,
      userAgent,
    });

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // seconds
      },
    };
  }

  static async login(input: LoginInput, ip?: string, userAgent?: string) {
    const identifier = input.emailOrPhone.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: input.emailOrPhone.trim() }],
      },
    });

    if (!user) {
      throw new UnauthorizedError('بيانات الدخول غير صحيحة، يرجى التحقق من البريد أو كلمة المرور');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('تم تعليق هذا الحساب. يرجى التواصل مع إدارة المنصة');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('بيانات الدخول غير صحيحة، يرجى التحقق من البريد أو كلمة المرور');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    await AuditLogService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email },
      ipAddress: ip,
      userAgent,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      city: user.city,
      status: user.status,
      preferredPitchType: user.preferredPitchType,
      createdAt: user.createdAt,
    };

    return {
      user: safeUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
      },
    };
  }

  static async refreshToken(oldRefreshToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Refresh Token غير صالح أو منتهي الصلاحية');
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh Token تم إلغاؤه أو انتهت صلاحيته');
    }

    if (tokenRecord.user.status === 'SUSPENDED') {
      throw new UnauthorizedError('تم إيقاف هذا الحساب');
    }

    // Revoke old token and issue a fresh pair
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const newAccessToken = this.generateAccessToken(tokenRecord.user);
    const newRefreshToken = this.generateRefreshToken(tokenRecord.user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: tokenRecord.user.id,
        expiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  static async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    } else if (userId) {
      await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }
    return true;
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        city: true,
        status: true,
        preferredPitchType: true,
        createdAt: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            bookings: true,
            venues: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('المستخدم غير موجود');
    }

    return user;
  }
}

