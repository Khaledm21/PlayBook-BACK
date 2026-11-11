import { z } from 'zod';

export const pitchTypes = ['5-a-side', '7-a-side', '8-a-side', '11-a-side'] as const;
export const turfTypes = ['Artificial Grass 5G', 'Natural', 'Hybrid'] as const;

export const createPitchSchema = z.object({
  venueId: z.string().min(1, 'معرف مجمع الملاعب مطلوب'),
  name: z.string().min(2, 'اسم الملعب مطلوب (مثال: الملعب الرئيسي A)'),
  type: z.enum(pitchTypes, {
    errorMap: () => ({ message: 'نوع الملعب يجب أن يكون: 5-a-side, 7-a-side, 8-a-side, 11-a-side' }),
  }),
  turfType: z.enum(turfTypes, {
    errorMap: () => ({ message: 'نوع النجيل يجب أن يكون: Artificial Grass 5G, Natural, Hybrid' }),
  }),
  isIndoor: z.boolean().default(false),
  hasNightLighting: z.boolean().default(true),
  capacity: z.number().int().min(2).default(10),
  basePricePerHour: z.number().positive('سعر الساعة الأساسي يجب أن يكون أكبر من صفر'),
  peakPricePerHour: z.number().positive('سعر ساعة الذروة مطلوب'),
  weekendPricePerHour: z.number().positive('سعر عطلة نهاية الأسبوع مطلوب'),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).optional().default([]),
});

export const updatePitchSchema = createPitchSchema.omit({ venueId: true }).partial();

export const pitchIdParamSchema = z.object({
  id: z.string().min(1, 'معرف الملعب مطلوب'),
});

export const venueIdParamSchema = z.object({
  venueId: z.string().min(1, 'معرف مجمع الملاعب مطلوب'),
});

export type CreatePitchInput = z.infer<typeof createPitchSchema>;
export type UpdatePitchInput = z.infer<typeof updatePitchSchema>;

