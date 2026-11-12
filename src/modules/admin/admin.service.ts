import bcrypt from 'bcryptjs';
import { prisma } from '../../db/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import {
  AddVenueForOwnerInput,
  CreateOwnerInput,
  GetOwnersQuery,
  UpdateOwnerSubscriptionInput,
} from './admin.schema';
import { normalizePhoneNumber, getPhoneSearchVariants } from '../../utils/phone';

function safeJsonParse(val: any, fallback: any = null) {
  if (typeof val !== 'string') return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export class AdminService {
  /**
   * List all venue owners with their subscriptions and venue stats
   */
  static async getOwners(query: GetOwnersQuery) {
    const where: any = {
      role: 'VENUE_OWNER',
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 50;
    const skip = (page - 1) * limit;

    const [total, owners] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          venues: {
            select: {
              id: true,
              _count: {
                select: { bookings: true },
              },
            },
          },
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      }),
    ]);

    const formatted = owners.map((user) => {
      const venuesCount = user.venues.length;
      const bookingsCount = user.venues.reduce(
        (sum, v) => sum + (v._count?.bookings || 0),
        0
      );

      const sub = user.subscription;
      let subscriptionData: any = null;

      if (sub) {
        const baseMax = sub.plan.maxVenues;
        const effectiveMax = sub.maxVenuesOverride ?? baseMax;
        const remaining = Math.max(0, effectiveMax - venuesCount);
        const isExpired = new Date(sub.expiresAt) < new Date();
        const isSuspended = sub.status === 'SUSPENDED';

        subscriptionData = {
          id: sub.id,
          ownerId: sub.ownerId,
          planId: sub.planId,
          planName: sub.plan.name,
          planSlug: sub.plan.slug,
          status: sub.status,
          startsAt: sub.startsAt.toISOString(),
          expiresAt: sub.expiresAt.toISOString(),
          baseMaxVenues: baseMax,
          maxVenuesOverride: sub.maxVenuesOverride,
          additionalVenueSlots: 0,
          effectiveMaxVenues: effectiveMax,
          remainingSlots: remaining,
          isExpired,
          isSuspended,
        };
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city || '',
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        venuesCount,
        bookingsCount,
        subscription: subscriptionData,
      };
    });

    return {
      owners: formatted,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single owner full profile, quota, venues, pitches, and recent bookings
   */
  static async getOwnerById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        venues: {
          include: {
            pitches: true,
            _count: {
              select: { bookings: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('صاحب الملعب غير موجود');
    }

    const venueIds = user.venues.map((v) => v.id);

    // Recent bookings across their venues
    const recentBookings = await prisma.booking.findMany({
      where: {
        venueId: { in: venueIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const sub = user.subscription;
    const venuesCount = user.venues.length;
    const baseMax = sub ? sub.plan.maxVenues : 0;
    const effectiveMax = sub ? (sub.maxVenuesOverride ?? baseMax) : 0;
    const remainingSlots = Math.max(0, effectiveMax - venuesCount);
    const isExpired = sub ? new Date(sub.expiresAt) < new Date() : false;
    const isSuspended = sub ? sub.status === 'SUSPENDED' : false;
    const canCreateVenue = !isExpired && !isSuspended && (venuesCount < effectiveMax);

    let reasonIfNotAllowed: string | undefined = undefined;
    if (!sub) reasonIfNotAllowed = 'لا يوجد اشتراك مخصص لهذا الحساب';
    else if (isSuspended) reasonIfNotAllowed = 'الحساب أو الاشتراك معلق حالياً';
    else if (isExpired) reasonIfNotAllowed = 'انتهت صلاحية باقة الاشتراك';
    else if (venuesCount >= effectiveMax) reasonIfNotAllowed = 'تم استهلاك الحد الأقصى للملاعب المسموح بها';

    const quota = {
      ownerId: user.id,
      subscriptionId: sub?.id || null,
      planId: sub?.planId || null,
      planName: sub?.plan.name || null,
      planSlug: sub?.plan.slug || null,
      status: sub?.status || 'NO_SUBSCRIPTION',
      startsAt: sub?.startsAt ? sub.startsAt.toISOString() : null,
      expiresAt: sub?.expiresAt ? sub.expiresAt.toISOString() : null,
      baseMaxVenues: baseMax,
      maxVenuesOverride: sub?.maxVenuesOverride || null,
      additionalVenueSlots: 0,
      effectiveMaxVenues: effectiveMax,
      currentVenuesCount: venuesCount,
      remainingSlots,
      isExpired,
      isSuspended,
      canCreateVenue,
      reasonIfNotAllowed,
    };

    const formattedSubscription = sub
      ? {
          id: sub.id,
          ownerId: sub.ownerId,
          planId: sub.planId,
          planName: sub.plan.name,
          planSlug: sub.plan.slug,
          status: sub.status,
          startsAt: sub.startsAt.toISOString(),
          expiresAt: sub.expiresAt.toISOString(),
          baseMaxVenues: baseMax,
          maxVenuesOverride: sub.maxVenuesOverride,
          additionalVenueSlots: 0,
          effectiveMaxVenues: effectiveMax,
          remainingSlots,
          isExpired,
          isSuspended,
        }
      : null;

    const formattedVenues = user.venues.map((v) => ({
      ...v,
      images: safeJsonParse(v.images, []),
      facilities: safeJsonParse(v.facilities, []),
      openingHours: safeJsonParse(v.openingHours, { open: '08:00', close: '02:00' }),
      bookingsCount: v._count.bookings,
    }));

    return {
      owner: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city || '',
        avatar: user.avatar,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      quota,
      subscription: formattedSubscription,
      venues: formattedVenues,
      recentBookings,
    };
  }

  /**
   * Provision a new venue owner with subscription plan and quota
   */
  static async createOwner(input: CreateOwnerInput, adminId: string) {
    // 1. Verify email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
    }

    // 2. Verify phone uniqueness
    const rawPhone = input.phone.trim();
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const phoneVariants = getPhoneSearchVariants(rawPhone);

    const existingPhone = await prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
      },
    });
    if (existingPhone) {
      throw new ConflictError('رقم الهاتف مسجل بالفعل لمستخدم آخر');
    }

    // 3. Verify plan exists (search by ID, slug, or slug without plan_ prefix)
    const cleanedPlanQuery = input.planId.trim();
    const slugWithoutPrefix = cleanedPlanQuery.replace(/^plan_/, '');
    const plan = await prisma.plan.findFirst({
      where: {
        OR: [
          { id: cleanedPlanQuery },
          { slug: cleanedPlanQuery },
          { slug: slugWithoutPrefix },
        ],
      },
    });
    if (!plan) {
      throw new NotFoundError(`باقة الاشتراك المختارة (${input.planId}) غير موجودة`);
    }

    // 4. Hash password
    const password = input.password || 'playbook123';
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Compute subscription dates
    const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
    let expiresAt: Date;
    if (input.expiresAt) {
      expiresAt = new Date(input.expiresAt);
    } else {
      expiresAt = new Date(startsAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // 6. Create User & Subscription in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name.trim(),
          email: input.email.toLowerCase().trim(),
          phone: normalizedPhone,
          passwordHash,
          role: 'VENUE_OWNER',
          city: input.city || 'Mansoura',
          status: input.status || 'ACTIVE',
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          ownerId: user.id,
          planId: plan.id,
          status: input.status || 'ACTIVE',
          startsAt,
          expiresAt,
          maxVenuesOverride: input.maxVenuesOverride ?? null,
        },
        include: {
          plan: true,
        },
      });

      return { user, subscription };
    });

    // 7. Audit Log
    await AuditLogService.log({
      userId: adminId,
      action: 'ADMIN_CREATE_VENUE_OWNER',
      entity: 'User',
      entityId: result.user.id,
      details: {
        ownerName: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        planName: plan.name,
        maxVenuesOverride: input.maxVenuesOverride,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = result.user;

    return {
      owner: userWithoutPassword,
      subscription: {
        ...result.subscription,
        plan: {
          ...result.subscription.plan,
          features: safeJsonParse(result.subscription.plan.features, []),
        },
      },
    };
  }

  /**
   * Update owner status (ACTIVE / SUSPENDED)
   */
  static async updateOwnerStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundError('المستخدم غير موجود');
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { status },
      });

      if (user.subscription) {
        await tx.subscription.update({
          where: { id: user.subscription.id },
          data: {
            status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
          },
        });
      }

      return u;
    });

    await AuditLogService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_OWNER_STATUS',
      entity: 'User',
      entityId: id,
      details: { oldStatus: user.status, newStatus: status },
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return { owner: safeUser };
  }

  /**
   * Update owner subscription (change plan, adjust limits, extend duration)
   */
  static async updateOwnerSubscription(
    ownerId: string,
    input: UpdateOwnerSubscriptionInput,
    adminId: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      include: {
        subscription: { include: { plan: true } },
        venues: true,
      },
    });

    if (!user) {
      throw new NotFoundError('صاحب الملعب غير موجود');
    }

    let planId = user.subscription?.planId;
    if (input.planId) {
      const cleanedPlanQuery = input.planId.trim();
      const slugWithoutPrefix = cleanedPlanQuery.replace(/^plan_/, '');
      const newPlan = await prisma.plan.findFirst({
        where: {
          OR: [
            { id: cleanedPlanQuery },
            { slug: cleanedPlanQuery },
            { slug: slugWithoutPrefix },
          ],
        },
      });
      if (!newPlan) throw new NotFoundError(`الباقة المحددة (${input.planId}) غير موجودة`);
      planId = newPlan.id;
    }

    if (!planId) {
      throw new BadRequestError('يرجى تحديد باقة اشتراك صالحة');
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : (user.subscription?.startsAt || new Date());
    let expiresAt: Date;
    if (input.expiresAt) {
      expiresAt = new Date(input.expiresAt);
    } else if (user.subscription?.expiresAt) {
      expiresAt = user.subscription.expiresAt;
    } else {
      expiresAt = new Date(startsAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const maxVenuesOverride =
      input.maxVenuesOverride !== undefined
        ? input.maxVenuesOverride
        : (user.subscription?.maxVenuesOverride ?? null);

    const subscription = await prisma.subscription.upsert({
      where: { ownerId },
      update: {
        planId,
        maxVenuesOverride,
        startsAt,
        expiresAt,
        status: input.status || 'ACTIVE',
      },
      create: {
        ownerId,
        planId,
        maxVenuesOverride,
        startsAt,
        expiresAt,
        status: input.status || 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    const venuesCount = user.venues.length;
    const baseMax = subscription.plan.maxVenues;
    const effectiveMax = subscription.maxVenuesOverride ?? baseMax;
    const remainingSlots = Math.max(0, effectiveMax - venuesCount);

    const quota = {
      ownerId,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      planName: subscription.plan.name,
      planSlug: subscription.plan.slug,
      status: subscription.status,
      startsAt: subscription.startsAt.toISOString(),
      expiresAt: subscription.expiresAt.toISOString(),
      baseMaxVenues: baseMax,
      maxVenuesOverride: subscription.maxVenuesOverride,
      additionalVenueSlots: 0,
      effectiveMaxVenues: effectiveMax,
      currentVenuesCount: venuesCount,
      remainingSlots,
      isExpired: new Date(subscription.expiresAt) < new Date(),
      isSuspended: subscription.status === 'SUSPENDED',
      canCreateVenue: venuesCount < effectiveMax && subscription.status === 'ACTIVE',
    };

    await AuditLogService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_SUBSCRIPTION',
      entity: 'Subscription',
      entityId: subscription.id,
      details: {
        ownerId,
        planId: subscription.planId,
        maxVenuesOverride: subscription.maxVenuesOverride,
        status: subscription.status,
      },
    });

    return { subscription, quota };
  }

  /**
   * Admin adds a venue directly assigned to an owner
   */
  static async addVenueForOwner(ownerId: string, input: AddVenueForOwnerInput, adminId: string) {
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      throw new NotFoundError('صاحب الملعب المحدد غير موجود');
    }

    const clean = input.name
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u0621-\u064A-]/g, '')
      .replace(/\s+/g, '-');
    const slug = `${clean}-${Date.now().toString().slice(-5)}`;

    const venue = await prisma.$transaction(async (tx) => {
      const createdVenue = await tx.venue.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          ownerId,
          city: input.city,
          area: input.area,
          address: input.address,
          minPricePerHour: input.minPricePerHour || 0,
          phone: input.phone || owner.phone,
          whatsapp: input.whatsapp || owner.phone,
          facilities: JSON.stringify(input.facilities || []),
          images: JSON.stringify(input.images || []),
          status: 'ACTIVE',
        },
      });

      const pitchesToCreate =
        input.pitches && input.pitches.length > 0
          ? input.pitches
          : [
              {
                name: 'الملعب الرئيسي',
                type: '7-a-side',
                turfType: 'Artificial Grass (5G)',
                capacity: 14,
                basePricePerHour: input.minPricePerHour || 300,
                peakPricePerHour: (input.minPricePerHour || 300) + 80,
                weekendPricePerHour: (input.minPricePerHour || 300) + 50,
              },
            ];

      for (const p of pitchesToCreate) {
        await tx.pitch.create({
          data: {
            venueId: createdVenue.id,
            name: p.name?.trim() || 'الملعب الرئيسي',
            type: p.type || '7-a-side',
            turfType: p.turfType || 'Artificial Grass (5G)',
            capacity: p.capacity || 14,
            basePricePerHour: p.basePricePerHour || input.minPricePerHour || 300,
            peakPricePerHour: p.peakPricePerHour || (p.basePricePerHour ? p.basePricePerHour + 80 : 380),
            weekendPricePerHour: p.weekendPricePerHour || (p.basePricePerHour ? p.basePricePerHour + 50 : 350),
            isActive: true,
          },
        });
      }

      return createdVenue;
    });

    await AuditLogService.log({
      userId: adminId,
      action: 'ADMIN_ADD_VENUE_FOR_OWNER',
      entity: 'Venue',
      entityId: venue.id,
      details: { venueName: venue.name, ownerId },
    });

    return {
      ...venue,
      facilities: safeJsonParse(venue.facilities, []),
      images: safeJsonParse(venue.images, []),
    };
  }
}

