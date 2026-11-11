import { prisma } from '../../db/prisma';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import { NotificationService } from '../notifications/notifications.service';
import { CreateReviewInput, GetReviewsQuery, ReplyReviewInput } from './reviews.schema';

export class ReviewService {
  static async createReview(userId: string, input: CreateReviewInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('المستخدم غير موجود');
    }

    const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
    if (!venue) {
      throw new NotFoundError('الملعب غير موجود');
    }

    let isVerifiedBooking = false;

    if (input.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
      });

      if (!booking || booking.userId !== userId || booking.venueId !== input.venueId) {
        throw new BadRequestError('بيانات الحجز غير مطابقة للملعب أو الحساب');
      }

      if (booking.hasReviewed) {
        throw new BadRequestError('تم تقييم هذا الحجز مسبقاً');
      }

      isVerifiedBooking = true;

      await prisma.booking.update({
        where: { id: input.bookingId },
        data: { hasReviewed: true },
      });
    }

    const review = await prisma.review.create({
      data: {
        venueId: input.venueId,
        bookingId: input.bookingId || null,
        userId,
        userName: user.name,
        userAvatar: user.avatar,
        rating: input.rating,
        pitchQuality: input.pitchQuality || null,
        cleanliness: input.cleanliness || null,
        staff: input.staff || null,
        lighting: input.lighting || null,
        comment: input.comment,
        verifiedBooking: isVerifiedBooking,
        status: 'APPROVED',
      },
    });

    // Recalculate venue rating and reviewCount
    const aggregate = await prisma.review.aggregate({
      where: { venueId: input.venueId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { id: true },
    });

    const newAvg = aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 0;
    const newCount = aggregate._count.id;

    await prisma.venue.update({
      where: { id: input.venueId },
      data: {
        rating: newAvg,
        reviewCount: newCount,
      },
    });

    // Notify venue owner
    await NotificationService.createNotification(
      venue.ownerId,
      'NEW_REVIEW_RECEIVED',
      'تقييم جديد لملعبك!',
      `أضاف ${user.name} تقييماً جديداً بقيمة (${input.rating} نجوم) لـ ${venue.name}.`
    );

    await AuditLogService.log({
      userId,
      action: 'CREATE_REVIEW',
      entity: 'Review',
      entityId: review.id,
      details: { venueId: input.venueId, rating: input.rating },
    });

    return review;
  }

  static async replyToReview(
    reviewId: string,
    ownerId: string,
    isAdmin: boolean,
    input: ReplyReviewInput
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { venue: true },
    });

    if (!review) {
      throw new NotFoundError('التقييم غير موجود');
    }

    if (!isAdmin && review.venue.ownerId !== ownerId) {
      throw new ForbiddenError('لا تملك الصلاحية للرد على هذا التقييم');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ownerReplyComment: input.replyComment,
        ownerReplyDate: new Date(),
      },
    });

    await NotificationService.createNotification(
      review.userId,
      'OWNER_REPLIED_TO_REVIEW',
      'رد صاحب الملعب على تقييمك',
      `قامت إدارة ${review.venue.name} بالرد على تعليقك.`
    );

    return updated;
  }

  static async getVenueReviews(venueId: string, query: GetReviewsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      venueId,
      status: 'APPROVED',
    };

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

