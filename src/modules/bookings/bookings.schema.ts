import { z } from 'zod';

export const createBookingSchema = z.object({
  pitchId: z.string().min(1, 'معرف الملعب مطلوب'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):00$/, 'وقت البدء يجب أن يكون على رأس الساعة بصيغة HH:00 (مثال 18:00)'),
  paymentMethod: z
    .enum(['PAY_AT_VENUE', 'INSTAPAY', 'VODAFONE_CASH', 'CREDIT_CARD'])
    .default('PAY_AT_VENUE'),
  notes: z.string().optional(),
});

export const getAvailabilityQuerySchema = z.object({
  pitchId: z.string().min(1, 'معرف الملعب مطلوب'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'),
});

export const blockSlotSchema = z.object({
  pitchId: z.string().min(1, 'معرف الملعب مطلوب'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):00$/, 'الوقت يجب أن يكون بصيغة HH:00'),
  reason: z.string().min(3, 'سبب الحظر مطلوب (مثال: صيانة أرضية، دورة رمضانية)'),
});

export const getBookingsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 20)),
  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  date: z.string().optional(),
  venueId: z.string().optional(),
  pitchId: z.string().optional(),
});

export const bookingIdParamSchema = z.object({
  id: z.string().min(1, 'معرف الحجز مطلوب'),
});

export const blockSlotIdParamSchema = z.object({
  id: z.string().min(1, 'معرف فترة الحظر مطلوب'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type GetAvailabilityQuery = z.infer<typeof getAvailabilityQuerySchema>;
export type BlockSlotInput = z.infer<typeof blockSlotSchema>;
export type GetBookingsQuery = z.infer<typeof getBookingsQuerySchema>;

