import { prisma } from '../../db/prisma';
import { NotFoundError } from '../../utils/errors';
import { GetNotificationsQuery } from './notifications.schema';

export class NotificationService {
  static async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string
  ) {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
      },
    });
  }

  static async getUserNotifications(userId: string, query: GetNotificationsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.unreadOnly) {
      where.read = false;
    }

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundError('الإشعار غير موجود أو لا يخص هذا الحساب');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

