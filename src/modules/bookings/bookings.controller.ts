import { Request, Response, NextFunction } from 'express';
import { BookingService } from './bookings.service';
import { sendSuccess } from '../../utils/response';
import { BadRequestError } from '../../utils/errors';
import {
  BlockSlotInput,
  CreateBookingInput,
  GetAvailabilityQuery,
  GetBookingsQuery,
} from './bookings.schema';

export class BookingController {
  static async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as GetAvailabilityQuery;
      const result = await BookingService.getAvailability(query);

      return sendSuccess(res, result, 200, 'تم استرجاع الساعات المتاحة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const body = req.body as CreateBookingInput;
      const booking = await BookingService.createBooking(userId, body);

      return sendSuccess(res, booking, 201, 'تم تأكيد الحجز بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const query = req.query as unknown as GetBookingsQuery;
      const result = await BookingService.getBookings(userId, userRole, query);

      return sendSuccess(res, result.bookings, 200, 'تم استرجاع قائمة الحجوزات بنجاح', result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const booking = await BookingService.getBookingById(id, userId, userRole);

      return sendSuccess(res, booking, 200, 'تم استرجاع تفاصيل الحجز بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { reason } = req.body;
      const updated = await BookingService.cancelBooking(id, userId, userRole, reason);

      return sendSuccess(res, updated, 200, 'تم إلغاء الحجز بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async blockSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const body = req.body as BlockSlotInput;
      const blockedSlot = await BookingService.blockSlot(userId, userRole, body);

      return sendSuccess(res, blockedSlot, 201, 'تم حظر الموعد بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async unblockSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { pitchId, date, time, startTime } = req.body || {};
      const targetTime = time || startTime;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      if (id) {
        await BookingService.unblockSlot(id, userId, userRole);
      } else if (pitchId && date && targetTime) {
        await BookingService.unblockSlotByDetails(pitchId, date, targetTime, userId, userRole);
      } else {
        throw new BadRequestError('يرجى تحديد معرف الحظر أو بيانات الملعب والموعد');
      }

      return sendSuccess(res, { success: true }, 200, 'تم فك حظر الموعد بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getBlockedSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const pitchId = req.query.pitchId as string | undefined;
      const date = req.query.date as string | undefined;
      const slots = await BookingService.getBlockedSlots(pitchId, date);

      return sendSuccess(res, slots, 200, 'تم استرجاع المواعيد المحظورة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const updated = await BookingService.updateStatus(id, status, userId, userRole);

      return sendSuccess(res, updated, 200, `تم تحديث حالة الحجز إلى ${status} بنجاح`);
    } catch (error) {
      next(error);
    }
  }

  static async confirmPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const result = await BookingService.confirmPayment(id, userId, userRole);

      return sendSuccess(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }
}

