import { prisma } from '../../db/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import { SubscriptionService } from '../subscriptions/subscriptions.service';
import { CreateVenueInput, GetVenuesQuery, UpdateVenueInput } from './venues.schema';

export class VenueService {
  private static generateSlug(name: string): string {
    const clean = name
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u0621-\u064A-]/g, '')
      .replace(/\s+/g, '-');
    return `${clean}-${Date.now().toString().slice(-5)}`;
  }

  static async createVenue(ownerId: string, input: CreateVenueInput, isAdmin = false) {
    // If not admin, strictly enforce subscription limits
    if (!isAdmin) {
      await SubscriptionService.checkCanAddVenue(ownerId);
    }

    const slug = this.generateSlug(input.name);

    const venue = await prisma.venue.create({
      data: {
        name: input.name,
        slug,
        tagline: input.tagline || null,
        description: input.description,
        ownerId,
        city: input.city,
        area: input.area,
        address: input.address,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        images: JSON.stringify(input.images || []),
        facilities: JSON.stringify(input.facilities || []),
        phone: input.phone,
        whatsapp: input.whatsapp || null,
        minPricePerHour: input.minPricePerHour || 0,
        openingHours: JSON.stringify(input.openingHours || { open: '08:00', close: '02:00' }),
        status: 'ACTIVE',
      },
    });

    await AuditLogService.log({
      userId: ownerId,
      action: 'CREATE_VENUE',
      entity: 'Venue',
      entityId: venue.id,
      details: { name: venue.name, city: venue.city },
    });

    return this.formatVenue(venue);
  }

  static async getVenues(query: GetVenuesQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
    };

    if (query.city) {
      where.city = { contains: query.city };
    }
    if (query.area) {
      where.area = { contains: query.area };
    }
    if (query.featured !== undefined) {
      where.featured = query.featured;
    }
    if (query.popular !== undefined) {
      where.popular = query.popular;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.minPricePerHour = {};
      if (query.minPrice !== undefined) where.minPricePerHour.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.minPricePerHour.lte = query.maxPrice;
    }

    if (query.pitchType) {
      where.pitches = {
        some: {
          type: query.pitchType,
          isActive: true,
        },
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { city: { contains: query.search } },
        { area: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [total, venues] = await Promise.all([
      prisma.venue.count({ where }),
      prisma.venue.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
        include: {
          pitches: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              type: true,
              turfType: true,
              basePricePerHour: true,
              isIndoor: true,
              hasNightLighting: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              pitches: true,
            },
          },
        },
      }),
    ]);

    return {
      venues: venues.map((v) => this.formatVenue(v)),
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getVenueByIdOrSlug(idOrSlug: string) {
    const venue = await prisma.venue.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        pitches: {
          where: { isActive: true },
        },
        reviews: {
          where: { status: 'APPROVED' },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!venue) {
      throw new NotFoundError('مجمع الملاعب المطلوب غير موجود');
    }

    return this.formatVenue(venue);
  }

  static async getOwnerVenues(ownerId: string) {
    const venues = await prisma.venue.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        pitches: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    return venues.map((v) => this.formatVenue(v));
  }

  static async updateVenue(
    venueId: string,
    ownerId: string,
    isAdmin: boolean,
    input: UpdateVenueInput
  ) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundError('مجمع الملاعب المطلوب غير موجود');
    }

    if (!isAdmin && venue.ownerId !== ownerId) {
      throw new ForbiddenError('غير مسموح لك بتعديل هذا المجمع؛ لست المالك المسجل له');
    }

    const updated = await prisma.venue.update({
      where: { id: venueId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.tagline !== undefined && { tagline: input.tagline }),
        ...(input.description && { description: input.description }),
        ...(input.city && { city: input.city }),
        ...(input.area && { area: input.area }),
        ...(input.address && { address: input.address }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.facilities && { facilities: JSON.stringify(input.facilities) }),
        ...(input.phone && { phone: input.phone }),
        ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
        ...(input.minPricePerHour !== undefined && { minPricePerHour: input.minPricePerHour }),
        ...(input.openingHours && { openingHours: JSON.stringify(input.openingHours) }),
        ...(input.images && { images: JSON.stringify(input.images) }),
      },
    });

    await AuditLogService.log({
      userId: ownerId,
      action: 'UPDATE_VENUE',
      entity: 'Venue',
      entityId: venueId,
      details: { updatedFields: Object.keys(input) },
    });

    return this.formatVenue(updated);
  }

  static async deleteVenue(venueId: string, ownerId: string, isAdmin: boolean) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundError('مجمع الملاعب المطلوب غير موجود');
    }

    if (!isAdmin && venue.ownerId !== ownerId) {
      throw new ForbiddenError('غير مسموح لك بحذف هذا المجمع؛ لست المالك');
    }

    await prisma.venue.delete({ where: { id: venueId } });

    await AuditLogService.log({
      userId: ownerId,
      action: 'DELETE_VENUE',
      entity: 'Venue',
      entityId: venueId,
      details: { venueName: venue.name },
    });

    return true;
  }

  static async addImages(venueId: string, ownerId: string, isAdmin: boolean, newImageUrls: string[]) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundError('الملعب غير موجود');
    }

    if (!isAdmin && venue.ownerId !== ownerId) {
      throw new ForbiddenError('ليس لديك صلاحية لإضافة صور لهذا الملعب');
    }

    let existingImages: string[] = [];
    try {
      existingImages = JSON.parse(venue.images);
    } catch {
      existingImages = [];
    }

    const merged = Array.from(new Set([...existingImages, ...newImageUrls]));

    const updated = await prisma.venue.update({
      where: { id: venueId },
      data: { images: JSON.stringify(merged) },
    });

    return this.formatVenue(updated);
  }

  private static formatVenue(venue: any) {
    return {
      ...venue,
      images: safeJsonParse(venue.images, []),
      facilities: safeJsonParse(venue.facilities, []),
      openingHours: safeJsonParse(venue.openingHours, { open: '08:00', close: '02:00' }),
    };
  }
}

function safeJsonParse(val: any, fallback: any = null) {
  if (typeof val !== 'string') return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

