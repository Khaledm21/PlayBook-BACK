import { prisma } from '../../db/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import { CreatePitchInput, UpdatePitchInput } from './pitches.schema';

export class PitchService {
  static async createPitch(ownerId: string, isAdmin: boolean, input: CreatePitchInput) {
    const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
    if (!venue) {
      throw new NotFoundError('مجمع الملاعب المحدد غير موجود');
    }

    if (!isAdmin && venue.ownerId !== ownerId) {
      throw new ForbiddenError('لا تملك صلاحية لإضافة ملعب لهذا المجمع');
    }

    const pitch = await prisma.pitch.create({
      data: {
        venueId: input.venueId,
        name: input.name,
        type: input.type,
        turfType: input.turfType,
        isIndoor: input.isIndoor ?? false,
        hasNightLighting: input.hasNightLighting ?? true,
        capacity: input.capacity ?? 10,
        basePricePerHour: input.basePricePerHour,
        peakPricePerHour: input.peakPricePerHour,
        weekendPricePerHour: input.weekendPricePerHour,
        isActive: input.isActive ?? true,
        features: JSON.stringify(input.features || []),
      },
    });

    // Update venue's minPricePerHour if this is lower or if venue had 0
    await this.updateVenueMinPrice(input.venueId);

    await AuditLogService.log({
      userId: ownerId,
      action: 'CREATE_PITCH',
      entity: 'Pitch',
      entityId: pitch.id,
      details: { pitchName: pitch.name, venueId: pitch.venueId, type: pitch.type },
    });

    return this.formatPitch(pitch);
  }

  static async getPitchById(id: string) {
    const pitch = await prisma.pitch.findUnique({
      where: { id },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            area: true,
            address: true,
            phone: true,
            openingHours: true,
            ownerId: true,
          },
        },
      },
    });

    if (!pitch) {
      throw new NotFoundError('الملعب المطلوب غير موجود');
    }

    return this.formatPitch(pitch);
  }

  static async getPitchesByVenue(venueId: string) {
    const pitches = await prisma.pitch.findMany({
      where: { venueId, isActive: true },
      orderBy: { basePricePerHour: 'asc' },
    });

    return pitches.map((p) => this.formatPitch(p));
  }

  static async updatePitch(
    pitchId: string,
    ownerId: string,
    isAdmin: boolean,
    input: UpdatePitchInput
  ) {
    const pitch = await prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { venue: true },
    });

    if (!pitch) {
      throw new NotFoundError('الملعب المطلوب غير موجود');
    }

    if (!isAdmin && pitch.venue.ownerId !== ownerId) {
      throw new ForbiddenError('غير مسموح لك بتعديل بيانات هذا الملعب');
    }

    const updated = await prisma.pitch.update({
      where: { id: pitchId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.type && { type: input.type }),
        ...(input.turfType && { turfType: input.turfType }),
        ...(input.isIndoor !== undefined && { isIndoor: input.isIndoor }),
        ...(input.hasNightLighting !== undefined && { hasNightLighting: input.hasNightLighting }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.basePricePerHour !== undefined && { basePricePerHour: input.basePricePerHour }),
        ...(input.peakPricePerHour !== undefined && { peakPricePerHour: input.peakPricePerHour }),
        ...(input.weekendPricePerHour !== undefined && { weekendPricePerHour: input.weekendPricePerHour }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.features && { features: JSON.stringify(input.features) }),
      },
    });

    await this.updateVenueMinPrice(pitch.venueId);

    await AuditLogService.log({
      userId: ownerId,
      action: 'UPDATE_PITCH',
      entity: 'Pitch',
      entityId: pitchId,
      details: { updatedFields: Object.keys(input) },
    });

    return this.formatPitch(updated);
  }

  static async deletePitch(pitchId: string, ownerId: string, isAdmin: boolean) {
    const pitch = await prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { venue: true },
    });

    if (!pitch) {
      throw new NotFoundError('الملعب المطلوب غير موجود');
    }

    if (!isAdmin && pitch.venue.ownerId !== ownerId) {
      throw new ForbiddenError('غير مسموح لك بحذف هذا الملعب');
    }

    await prisma.pitch.delete({ where: { id: pitchId } });
    await this.updateVenueMinPrice(pitch.venueId);

    await AuditLogService.log({
      userId: ownerId,
      action: 'DELETE_PITCH',
      entity: 'Pitch',
      entityId: pitchId,
      details: { pitchName: pitch.name },
    });

    return true;
  }

  private static async updateVenueMinPrice(venueId: string) {
    const cheapest = await prisma.pitch.findFirst({
      where: { venueId, isActive: true },
      orderBy: { basePricePerHour: 'asc' },
    });

    if (cheapest) {
      await prisma.venue.update({
        where: { id: venueId },
        data: { minPricePerHour: cheapest.basePricePerHour },
      });
    }
  }

  private static formatPitch(pitch: any) {
    return {
      ...pitch,
      features: safeJsonParse(pitch.features, []),
    };
  }
}

function safeJsonParse(val: any, fallback: any = []) {
  if (typeof val !== 'string') return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

