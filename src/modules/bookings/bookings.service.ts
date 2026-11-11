import { prisma } from '../../db/prisma';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import { NotificationService } from '../notifications/notifications.service';
import {
  BlockSlotInput,
  CreateBookingInput,
  GetAvailabilityQuery,
  GetBookingsQuery,
} from './bookings.schema';

export class BookingService {
  private static calculateEndTime(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0], 10);
    const nextHour = (hour + 1) % 24;
    return `${nextHour.toString().padStart(2, '0')}:00`;
  }

  private static formatDisplayTime(startTime: string, endTime: string): string {
    const formatHour = (time: string) => {
      const [h] = time.split(':');
      let hourNum = parseInt(h, 10);
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      if (hourNum === 0) hourNum = 12;
      else if (hourNum > 12) hourNum -= 12;
      return `${hourNum.toString().padStart(2, '0')}:00 ${ampm}`;
    };

    return `${formatHour(startTime)} - ${formatHour(endTime)}`;
  }

  private static getHourlyRate(pitch: any, dateStr: string, startTime: string) {
    const targetDate = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = targetDate.getUTCDay(); // 5 = Friday, 6 = Saturday in UTC
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    const startHour = parseInt(startTime.split(':')[0], 10);
    const isPeakTime = startHour >= 18 || startHour < 2; // Evening 6 PM onwards or after midnight

    let price = pitch.basePricePerHour;
    let rateType = 'BASE';

    if (isWeekend) {
      price = pitch.weekendPricePerHour;
      rateType = 'WEEKEND';
    } else if (isPeakTime) {
      price = pitch.peakPricePerHour;
      rateType = 'PEAK';
    }

    return { price, rateType, isPeakTime };
  }

  private static validateBookingDate(dateStr: string, startTime: string) {
    const now = new Date();
    // Convert to local Egypt time (+2)
    const [year, month, day] = dateStr.split('-').map(Number);
    const [startHour] = startTime.split(':').map(Number);
    const bookingDateTime = new Date(year, month - 1, day, startHour, 0, 0);

    // Cannot book past slots
    if (bookingDateTime.getTime() < now.getTime()) {
      throw new BadRequestError('لا يمكن حجز موعد في وقت ماضٍ');
    }

    // Max 30 days ahead
    const maxDaysAhead = 30 * 24 * 60 * 60 * 1000;
    if (bookingDateTime.getTime() - now.getTime() > maxDaysAhead) {
      throw new BadRequestError('لا يمكن حجز مواعيد لأكثر من 30 يوماً مقدماً');
    }
  }

  static async getAvailability(query: GetAvailabilityQuery) {
    const pitch = await prisma.pitch.findUnique({
      where: { id: query.pitchId },
      include: {
        venue: true,
      },
    });

    if (!pitch || !pitch.isActive) {
      throw new NotFoundError('الملعب غير موجود أو غير نشط حالياً');
    }

    const { date } = query;

    // Fetch existing active bookings for this date and pitch
    const bookings = await prisma.booking.findMany({
      where: {
        pitchId: query.pitchId,
        date,
        status: { not: 'CANCELLED' },
      },
      select: {
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    const bookedTimes = new Set(bookings.map((b) => b.startTime));

    // Fetch blocked slots (maintenance, academy, etc.)
    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        pitchId: query.pitchId,
        date,
      },
    });

    const blockedMap = new Map<string, string>();
    blockedSlots.forEach((slot) => {
      blockedMap.set(slot.time, slot.reason || 'محظور للصيانة');
    });

    // Generate slots: Standard Egyptian football pitches open 09:00 to 02:00 next morning
    const operatingHours = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
      '21:00', '22:00', '23:00', '00:00', '01:00'
    ];

    const slots = operatingHours.map((time) => {
      const endTime = this.calculateEndTime(time);
      const displayTime = this.formatDisplayTime(time, endTime);
      const isBooked = bookedTimes.has(time);
      const isBlocked = blockedMap.has(time);
      const isAvailable = !isBooked && !isBlocked;

      const { price, rateType, isPeakTime } = this.getHourlyRate(pitch, date, time);

      let unavailableReason: string | null = null;
      if (isBooked) unavailableReason = 'محجوز مسبقاً';
      else if (isBlocked) unavailableReason = blockedMap.get(time) || 'فترة محظورة';

      return {
        startTime: time,
        endTime,
        displayTime,
        isAvailable,
        price,
        rateType,
        isPeak: isPeakTime,
        reason: unavailableReason,
      };
    });

    return {
      date,
      pitch: {
        id: pitch.id,
        name: pitch.name,
        type: pitch.type,
        turfType: pitch.turfType,
        venueName: pitch.venue.name,
        city: pitch.venue.city,
      },
      slots,
    };
  }

  static async createBooking(userId: string, input: CreateBookingInput) {
    this.validateBookingDate(input.date, input.startTime);

    const slotLockKey = `${input.pitchId}_${input.date}_${input.startTime}`;

    // Execute within atomic transaction for Double-Booking & Concurrency Protection
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Fetch user details
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError('المستخدم غير موجود');
      }

      // 2. Fetch pitch and venue
      const pitch = await tx.pitch.findUnique({
        where: { id: input.pitchId },
        include: { venue: true },
      });
      if (!pitch || !pitch.isActive) {
        throw new NotFoundError('الملعب المطلوب غير متوفر حالياً');
      }

      // 3. Check BlockedSlot table
      const blocked = await tx.blockedSlot.findUnique({
        where: {
          pitchId_date_time: {
            pitchId: input.pitchId,
            date: input.date,
            time: input.startTime,
          },
        },
      });
      if (blocked) {
        throw new ConflictError(
          `هذا الموعد محظور من قبل إدارة الملعب بسبب: (${blocked.reason || 'صيانة الدورية'})`
        );
      }

      // 4. Check existing active booking with lock key
      const existingBooking = await tx.booking.findFirst({
        where: {
          slotLockKey,
          status: { not: 'CANCELLED' },
        },
      });
      if (existingBooking) {
        throw new ConflictError(
          'نعتذر، تم حجز هذا الموعد للتو بواسطة لاعب آخر. يرجى اختيار موعد آخر.'
        );
      }

      // 5. Calculate prices
      const { price } = this.getHourlyRate(pitch, input.date, input.startTime);
      const serviceFee = 15; // 15 EGP PlayBook platform fee
      const totalAmount = price + serviceFee;
      const endTime = this.calculateEndTime(input.startTime);
      const displayTime = this.formatDisplayTime(input.startTime, endTime);

      const bookingReference = `PB-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      let venueImages: string[] = [];
      try {
        venueImages = JSON.parse(pitch.venue.images);
      } catch {
        venueImages = [];
      }

      // 6. Create booking record
      const createdBooking = await tx.booking.create({
        data: {
          bookingReference,
          slotLockKey,
          userId: user.id,
          venueId: pitch.venue.id,
          pitchId: pitch.id,
          pitchName: pitch.name,
          pitchType: pitch.type,
          venueName: pitch.venue.name,
          venueCity: pitch.venue.city,
          venueAddress: pitch.venue.address,
          venueImage: venueImages[0] || null,
          userName: user.name,
          userPhone: user.phone,
          date: input.date,
          startTime: input.startTime,
          endTime,
          displayTime,
          durationHours: 1.0,
          pitchPrice: price,
          serviceFee,
          totalAmount,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === 'PAY_AT_VENUE' ? 'PENDING' : 'PENDING',
          status: 'UPCOMING',
          notes: input.notes || null,
        },
      });

      // 7. Create payment transaction if not PAY_AT_VENUE
      if (input.paymentMethod !== 'PAY_AT_VENUE') {
        await tx.paymentTransaction.create({
          data: {
            bookingId: createdBooking.id,
            userId: user.id,
            amount: totalAmount,
            currency: 'EGP',
            paymentMethod: input.paymentMethod,
            provider: input.paymentMethod,
            transactionReference: `TX-${bookingReference}`,
            status: 'PENDING',
          },
        });
      }

      return {
        booking: createdBooking,
        ownerId: pitch.venue.ownerId,
        userEmail: user.email,
        venueName: pitch.venue.name,
      };
    });

    // Post-transaction notifications and audit logs
    await Promise.all([
      AuditLogService.log({
        userId,
        action: 'CREATE_BOOKING',
        entity: 'Booking',
        entityId: booking.booking.id,
        details: {
          reference: booking.booking.bookingReference,
          pitchName: booking.booking.pitchName,
          date: booking.booking.date,
          totalAmount: booking.booking.totalAmount,
        },
      }),
      NotificationService.createNotification(
        userId,
        'BOOKING_CONFIRMED',
        'تم تأكيد حجزك بنجاح!',
        `تم حجز ${booking.booking.pitchName} في ${booking.booking.venueName} ليوم ${booking.booking.date} الساعة ${booking.booking.displayTime}. كود الحجز: ${booking.booking.bookingReference}`
      ),
      NotificationService.createNotification(
        booking.ownerId,
        'NEW_BOOKING_ALERT',
        'حجز جديد لملعبك!',
        `قام اللاعب ${booking.booking.userName} بحجز ${booking.booking.pitchName} ليوم ${booking.booking.date} الساعة ${booking.booking.displayTime}.`
      ),
    ]);

    return booking.booking;
  }

  static async getBookings(userId: string, userRole: string, query: GetBookingsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userRole === 'USER') {
      where.userId = userId;
    } else if (userRole === 'VENUE_OWNER') {
      where.venue = { ownerId: userId };
    }
    // ADMIN sees all

    if (query.status) where.status = query.status;
    if (query.date) where.date = query.date;
    if (query.venueId) where.venueId = query.venueId;
    if (query.pitchId) where.pitchId = query.pitchId;

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatar: true,
            },
          },
          pitch: {
            select: {
              id: true,
              name: true,
              type: true,
              turfType: true,
            },
          },
        },
      }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getBookingById(bookingId: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: true,
        pitch: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
        transactions: true,
        review: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('الحجز المطلوب غير موجود');
    }

    // Permission check
    if (userRole === 'USER' && booking.userId !== userId) {
      throw new ForbiddenError('غير مسموح لك بالاطلاع على تفاصيل هذا الحجز');
    }

    if (userRole === 'VENUE_OWNER' && booking.venue.ownerId !== userId) {
      throw new ForbiddenError('غير مسموح لك بالاطلاع على حجز لا يخص ملاعبك');
    }

    return booking;
  }

  static async cancelBooking(bookingId: string, userId: string, userRole: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true },
    });

    if (!booking) {
      throw new NotFoundError('الحجز غير موجود');
    }

    const isUser = booking.userId === userId;
    const isOwner = booking.venue.ownerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isUser && !isOwner && !isAdmin) {
      throw new ForbiddenError('لا تملك الصلاحية لإلغاء هذا الحجز');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('هذا الحجز ملغي بالفعل مسبقاً');
    }

    // Release slotLockKey so other players can book this slot
    const releasedKey = `${booking.slotLockKey}_CANCELLED_${Date.now()}`;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        slotLockKey: releasedKey,
        notes: reason ? `${booking.notes || ''} [سبب الإلغاء: ${reason}]` : booking.notes,
      },
    });

    await AuditLogService.log({
      userId,
      action: 'CANCEL_BOOKING',
      entity: 'Booking',
      entityId: bookingId,
      details: {
        reference: booking.bookingReference,
        cancelledBy: userRole,
        reason,
      },
    });

    // Notify user & owner
    const targetNotifyUser = isUser ? booking.venue.ownerId : booking.userId;
    await NotificationService.createNotification(
      targetNotifyUser,
      'BOOKING_CANCELLED',
      'تم إلغاء الحجز',
      `تم إلغاء الحجز رقم ${booking.bookingReference} الخاص بملعب ${booking.pitchName} ليوم ${booking.date}.`
    );

    return updated;
  }

  static async blockSlot(userId: string, userRole: string, input: BlockSlotInput) {
    const pitch = await prisma.pitch.findUnique({
      where: { id: input.pitchId },
      include: { venue: true },
    });

    if (!pitch) {
      throw new NotFoundError('الملعب غير موجود');
    }

    if (userRole !== 'ADMIN' && pitch.venue.ownerId !== userId) {
      throw new ForbiddenError('غير مصرح لك بحظر فترات في هذا الملعب');
    }

    // Check if slot has active booking
    const activeBooking = await prisma.booking.findFirst({
      where: {
        pitchId: input.pitchId,
        date: input.date,
        startTime: input.time,
        status: { not: 'CANCELLED' },
      },
    });

    if (activeBooking) {
      throw new ConflictError(
        `لا يمكن حظر هذا الموعد؛ يوجد حجز مسبق بالفعل برقم مرجعي (${activeBooking.bookingReference})`
      );
    }

    const blockedSlot = await prisma.blockedSlot.create({
      data: {
        venueId: pitch.venueId,
        pitchId: input.pitchId,
        date: input.date,
        time: input.time,
        reason: input.reason,
        blockedBy: userId,
      },
    });

    await AuditLogService.log({
      userId,
      action: 'BLOCK_SLOT',
      entity: 'BlockedSlot',
      entityId: blockedSlot.id,
      details: { pitchId: input.pitchId, date: input.date, time: input.time, reason: input.reason },
    });

    return blockedSlot;
  }

  static async unblockSlot(blockedSlotId: string, userId: string, userRole: string) {
    const slot = await prisma.blockedSlot.findUnique({
      where: { id: blockedSlotId },
      include: { venue: true },
    });

    if (!slot) {
      throw new NotFoundError('فترة الحظر غير موجودة');
    }

    if (userRole !== 'ADMIN' && slot.venue.ownerId !== userId) {
      throw new ForbiddenError('غير مصرح لك بإلغاء حظر هذه الفترة');
    }

    await prisma.blockedSlot.delete({ where: { id: blockedSlotId } });

    await AuditLogService.log({
      userId,
      action: 'UNBLOCK_SLOT',
      entity: 'BlockedSlot',
      entityId: blockedSlotId,
      details: { pitchId: slot.pitchId, date: slot.date, time: slot.time },
    });

    return true;
  }
}

