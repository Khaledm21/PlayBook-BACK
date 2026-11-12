import { z } from 'zod';

export const createVenueSchema = z.object({
  name: z.string().min(2, 'اسم مجمع الملاعب يجب أن لا يقل عن حرفين'),
  tagline: z.string().optional(),
  description: z.string().min(3, 'الوصف مطلوب'),
  city: z.string().min(2, 'المدينة مطلوبة'),
  area: z.string().min(2, 'المنطقة مطلوبة'),
  address: z.string().min(3, 'العنوان مطلوب'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  facilities: z.array(z.string()).default([]),
  phone: z.string().min(8, 'رقم هاتف الملعب مطلوب'),
  whatsapp: z.string().optional(),
  minPricePerHour: z.number().nonnegative().optional().default(0),
  openingHours: z
    .object({
      open: z.string().default('08:00'),
      close: z.string().default('02:00'),
    })
    .default({ open: '08:00', close: '02:00' }),
  images: z.array(z.string()).optional().default([]),
  pitches: z
    .array(
      z.object({
        name: z.string().optional(),
        type: z.string().optional(),
        turfType: z.string().optional(),
        isIndoor: z.boolean().optional(),
        hasNightLighting: z.boolean().optional(),
        capacity: z.number().optional(),
        basePricePerHour: z.number().optional(),
        peakPricePerHour: z.number().optional(),
        weekendPricePerHour: z.number().optional(),
        features: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

export const updateVenueSchema = createVenueSchema.partial();

export const venueIdParamSchema = z.object({
  id: z.string().min(1, 'معرف الملعب مطلوب'),
});

export const getVenuesQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 20)),
  city: z.string().optional(),
  area: z.string().optional(),
  featured: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  popular: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  minPrice: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
  maxPrice: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
  search: z.string().optional(),
  pitchType: z.string().optional(),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type GetVenuesQuery = z.infer<typeof getVenuesQuerySchema>;
