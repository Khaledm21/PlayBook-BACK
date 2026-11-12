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

  static async getCalendar(pitchId: string, dateStr: string) {
    const pitch = await prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { venue: true },
    });

    if (!pitch) {
      throw new NotFoundError('الملعب غير موجود');
    }

    const bookings = await prisma.booking.findMany({
      where: {
        pitchId,
        date: dateStr,
        status: { not: 'CANCELLED' },
      },
    });

    const bookingMap = new Map<string, any>();
    bookings.forEach((b) => bookingMap.set(b.startTime, b));

    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        pitchId,
        date: dateStr,
      },
    });

    const blockedMap = new Map<string, string>();
    blockedSlots.forEach((slot) => {
      blockedMap.set(slot.time, slot.reason || 'محظور للصيانة');
    });

    const operatingHours = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
      '21:00', '22:00', '23:00', '00:00', '01:00',
    ];

    const targetDate = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = targetDate.getUTCDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    const slots = operatingHours.map((time) => {
      const hour = parseInt(time.split(':')[0], 10);
      const nextHour = (hour + 1) % 24;
      const endTime = `${nextHour.toString().padStart(2, '0')}:00`;

      const formatHour = (t: string) => {
        const [h] = t.split(':');
        let hNum = parseInt(h, 10);
        const ampm = hNum >= 12 ? 'PM' : 'AM';
        if (hNum === 0) hNum = 12;
        else if (hNum > 12) hNum -= 12;
        return `${hNum.toString().padStart(2, '0')}:00 ${ampm}`;
      };
      const displayTime = `${formatHour(time)} - ${formatHour(endTime)}`;

      const isPeak = hour >= 18 || hour < 2;
      let price = pitch.basePricePerHour;
      if (isWeekend) price = pitch.weekendPricePerHour;
      else if (isPeak) price = pitch.peakPricePerHour;

      const booking = bookingMap.get(time);
      const isBlocked = blockedMap.has(time);
      const isBooked = !!booking;
      const isAvailable = !isBooked && !isBlocked;

      let status: 'AVAILABLE' | 'BOOKED' | 'PENDING_PAYMENT' | 'BLOCKED' | 'COMPLETED' = 'AVAILABLE';
      if (isBlocked) status = 'BLOCKED';
      else if (booking) {
        if (booking.status === 'COMPLETED') status = 'COMPLETED';
        else if (booking.paymentStatus === 'PENDING') status = 'PENDING_PAYMENT';
        else status = 'BOOKED';
      }

      return {
        time,
        displayTime,
        status,
        isAvailable,
        isBooked,
        isBlocked,
        price,
        isPeak,
        isWeekend,
        booking: booking
          ? {
              id: booking.id,
              bookingReference: booking.bookingReference,
              userName: booking.userName,
              userPhone: booking.userPhone,
              startTime: booking.startTime,
              endTime: booking.endTime,
              totalAmount: booking.totalAmount,
              paymentStatus: booking.paymentStatus,
              status: booking.status,
            }
          : null,
      };
    });

    return {
      pitchId: pitch.id,
      pitchName: pitch.name,
      pitchType: pitch.type,
      venueId: pitch.venueId,
      venueName: pitch.venue.name,
      date: dateStr,
      slots,
    };
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

