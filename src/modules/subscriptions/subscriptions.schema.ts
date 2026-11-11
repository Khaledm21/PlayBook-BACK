import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2, 'اسم الباقة مطلوب'),
  slug: z.string().min(2, 'الرمز التعريفي مطلوب'),
  description: z.string().min(5, 'الوصف مطلوب'),
  price: z.number().nonnegative('السعر يجب أن يكون رقم موجب أو صفر'),
  billingPeriod: z.string().default('monthly'),
  maxVenues: z.number().int().positive('أقصى عدد للملاعب يجب أن يكون 1 على الأقل'),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const subscribeSchema = z.object({
  planSlug: z.string().min(1, 'كود الباقة مطلوب (basic, pro, business, enterprise)'),
  billingMonths: z.number().int().min(1).default(1),
});

export const updateSubscriptionStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'], {
    errorMap: () => ({ message: 'الحالة غير صالحة' }),
  }),
});

export const subscriptionIdParamSchema = z.object({
  id: z.string().min(1, 'معرف الاشتراك مطلوب'),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UpdateSubscriptionStatusInput = z.infer<typeof updateSubscriptionStatusSchema>;

