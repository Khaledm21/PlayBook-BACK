import { prisma } from '../../db/prisma';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import { GetUsersQuery, UpdateProfileInput } from './users.schema';
import { normalizePhoneNumber, getPhoneSearchVariants } from '../../utils/phone';

export class UserService {
  static async getUsers(query: GetUsersQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          avatar: true,
          city: true,
          preferredPitchType: true,
          createdAt: true,
          _count: {
            select: {
              venues: true,
              bookings: true,
            },
          },
        },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        city: true,
        preferredPitchType: true,
        createdAt: true,
        venues: {
          select: {
            id: true,
            name: true,
            city: true,
            status: true,
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('المستخدم غير موجود');
    }

    return user;
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    if (data.phone) {
      const normalizedPhone = normalizePhoneNumber(data.phone);
      const phoneVariants = getPhoneSearchVariants(data.phone);
      const existing = await prisma.user.findFirst({
        where: {
          phone: { in: phoneVariants },
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new ConflictError('رقم الهاتف مسجل بالفعل لمستخدم آخر');
      }
      data.phone = normalizedPhone;
    }

    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.preferredPitchType !== undefined && { preferredPitchType: data.preferredPitchType }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        city: true,
        preferredPitchType: true,
        updatedAt: true,
      },
    });
  }

  static async updateStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED', adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // If suspended, revoke all active refresh tokens
    if (status === 'SUSPENDED') {
      await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    }

    await AuditLogService.log({
      userId: adminId,
      action: 'UPDATE_USER_STATUS',
      entity: 'User',
      entityId: userId,
      details: { oldStatus: user.status, newStatus: status },
    });

    return updated;
  }

  static async updateRole(userId: string, role: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await AuditLogService.log({
      userId: adminId,
      action: 'UPDATE_USER_ROLE',
      entity: 'User',
      entityId: userId,
      details: { oldRole: user.role, newRole: role },
    });

    return updated;
  }

  static async updateUser(userId: string, data: any, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود');
    }

    if (data.status) {
      return this.updateStatus(userId, data.status, adminId);
    }

    if (data.role) {
      return this.updateRole(userId, data.role, adminId);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.preferredPitchType !== undefined && { preferredPitchType: data.preferredPitchType }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        city: true,
        preferredPitchType: true,
        updatedAt: true,
      },
    });

    await AuditLogService.log({
      userId: adminId,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: userId,
      details: data,
    });

    return updated;
  }
}

