import { prisma } from '../../db/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import { NotificationService } from '../notifications/notifications.service';
import { CreatePlanInput, SubscribeInput } from './subscriptions.schema';

export class SubscriptionService {
  static async getPlans() {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return plans.map((plan) => ({
      ...plan,
      features: safeJsonParse(plan.features),
    }));
  }

  static async getOwnerSubscription(ownerId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { ownerId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return null;
    }

    const venuesCount = await prisma.venue.count({
      where: { ownerId },
    });

    const maxAllowed = subscription.maxVenuesOverride ?? subscription.plan.maxVenues;
    const isExpired = new Date(subscription.expiresAt) < new Date();

    return {
      ...subscription,
      isExpired,
      venuesCount,
      maxVenuesAllowed: maxAllowed,
      remainingVenues: Math.max(0, maxAllowed - venuesCount),
      plan: {
        ...subscription.plan,
        features: safeJsonParse(subscription.plan.features),
      },
    };
  }

  static async checkCanAddVenue(ownerId: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { ownerId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenError(
        'ليس لديك باقة اشتراك سارية. يرجى الاشتراك في إحدى باقات PlayBook للملاك لإضافة ملاعب جديدة.'
      );
    }

    if (subscription.status !== 'ACTIVE') {
      throw new ForbiddenError(
        `اشتراكك الحالي في حالة (${subscription.status}). يرجى تفعيل أو تجديد الاشتراك لتتمكن من إضافة ملاعب.`
      );
    }

    if (new Date(subscription.expiresAt) < new Date()) {
      throw new ForbiddenError(
        'انتهت فترة اشتراكك الحالية. يرجى تجديد الباقة لتتمكن من إضافة ملاعب أو استقبال حجوزات جديدة.'
      );
    }

    const maxAllowed = subscription.maxVenuesOverride ?? subscription.plan.maxVenues;
    const currentVenuesCount = await prisma.venue.count({
      where: { ownerId },
    });

    if (currentVenuesCount >= maxAllowed) {
      throw new ForbiddenError(
        `لقد استهلكت الحد الأقصى للملاعب المسموح بها في باقتك الحالية (${currentVenuesCount} من ${maxAllowed} ملاعب). يرجى ترقية باقتك إلى باقة أعلى (مثل Pro أو Business أو Enterprise) لإضافة المزيد من المجمعات والملاعب.`
      );
    }
  }

  static async subscribe(ownerId: string, input: SubscribeInput) {
    const plan = await prisma.plan.findUnique({
      where: { slug: input.planSlug },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundError('الباقة المطلوبة غير متوفرة أو غير نشطة');
    }

    const months = input.billingMonths || 1;
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(now.getMonth() + months);

    const subscription = await prisma.subscription.upsert({
      where: { ownerId },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt,
        maxVenuesOverride: null,
      },
      create: {
        ownerId,
        planId: plan.id,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt,
      },
      include: {
        plan: true,
      },
    });

    await AuditLogService.log({
      userId: ownerId,
      action: 'UPGRADE_SUBSCRIPTION_PLAN',
      entity: 'Subscription',
      entityId: subscription.id,
      details: {
        planName: plan.name,
        planSlug: plan.slug,
        months,
        totalAmount: plan.price * months,
      },
    });

    await NotificationService.createNotification(
      ownerId,
      'SUBSCRIPTION_ACTIVATED',
      'تم تفعيل باقة الاشتراك بنجاح',
      `تم تفعيل اشتراكك في باقة "${plan.name}" بنجاح وتستوعب حتى ${plan.maxVenues} ملاعب.`
    );

    return {
      ...subscription,
      plan: {
        ...subscription.plan,
        features: safeJsonParse(subscription.plan.features),
      },
    };
  }

  static async updateStatus(id: string, status: string, adminId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { owner: true, plan: true },
    });

    if (!subscription) {
      throw new NotFoundError('الاشتراك غير موجود');
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status },
      include: { plan: true },
    });

    await AuditLogService.log({
      userId: adminId,
      action: 'UPDATE_SUBSCRIPTION_STATUS',
      entity: 'Subscription',
      entityId: id,
      details: { oldStatus: subscription.status, newStatus: status, ownerId: subscription.ownerId },
    });

    return updated;
  }

  static async getAllSubscriptions() {
    const subs = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        plan: true,
      },
    });

    return subs.map((s) => ({
      ...s,
      plan: {
        ...s.plan,
        features: safeJsonParse(s.plan.features),
      },
    }));
  }
}

function safeJsonParse(val: string) {
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

