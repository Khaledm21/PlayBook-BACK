import { z } from 'zod';
import { isFlexibleEgyptianPhone } from '../../utils/phone';

export const getOwnersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ownerIdParamSchema = z.object({
  id: z.string().min(1, 'معرف المالك مطلوب'),
});

export const createOwnerSchema = z.object({
  name: z.string().min(2, 'اسم المالك يجب أن يتكون من حرفين على الأقل'),
  email: z.string().email('صيغة البريد الإلكتروني غير صحيحة'),
  phone: z
    .string()
    .min(8, 'رقم الهاتف غير صالح')
    .refine((val) => isFlexibleEgyptianPhone(val), {
      message: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678 أو +20 10...)',
    }),
  password: z.string().min(6, 'كلمة المرور يجب ألا تقل عن 6 أحرف').default('playbook123'),
  planId: z.string().min(1, 'يرجى اختيار باقة اشتراك صالحة'),
  maxVenuesOverride: z.number().int().min(1).nullable().optional(),
  additionalVenueSlots: z.number().int().min(0).default(0).optional(),
  city: z.string().default('Mansoura').optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE').optional(),
  startsAt: z.string().datetime().or(z.string()).optional(),
  expiresAt: z.string().datetime().or(z.string()).optional(),
});

export const updateOwnerStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'], {
    required_error: 'حالة الحساب مطلوبة (ACTIVE أو SUSPENDED)',
  }),
});

export const updateOwnerSubscriptionSchema = z.object({
  planId: z.string().optional(),
  maxVenuesOverride: z.number().int().min(1).nullable().optional(),
  additionalVenueSlots: z.number().int().min(0).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED']).optional(),
});

export const addVenueForOwnerSchema = z.object({
  name: z.string().min(3, 'اسم مجمع الملاعب يجب أن يتكون من 3 أحرف على الأقل'),
  city: z.string().min(2, 'اسم المدينة مطلوب'),
  area: z.string().min(2, 'اسم المنطقة مطلوب'),
  address: z.string().min(5, 'العنوان التفصيلي مطلوب'),
  description: z.string().optional().default('مجمع ملاعب رياضي متميز مجهز بأحدث التجهيزات الرياضية'),
  minPricePerHour: z.number().min(0).default(0),
  facilities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  pitches: z
    .array(
      z.object({
        name: z.string().min(2),
        type: z.string().default('7-a-side'),
        turfType: z.string().default('Artificial Grass (5G)'),
        capacity: z.number().default(14),
        basePricePerHour: z.number().min(0),
        peakPricePerHour: z.number().min(0).optional(),
        weekendPricePerHour: z.number().min(0).optional(),
      })
    )
    .optional(),
});

export type GetOwnersQuery = z.infer<typeof getOwnersQuerySchema>;
export type CreateOwnerInput = z.infer<typeof createOwnerSchema>;
export type UpdateOwnerStatusInput = z.infer<typeof updateOwnerStatusSchema>;
export type UpdateOwnerSubscriptionInput = z.infer<typeof updateOwnerSubscriptionSchema>;
export type AddVenueForOwnerInput = z.infer<typeof addVenueForOwnerSchema>;

