import { z } from 'zod';
import { isFlexibleEgyptianPhone } from '../../utils/phone';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن لا يقل عن حرفين').optional(),
  phone: z
    .string()
    .refine((val) => isFlexibleEgyptianPhone(val), {
      message: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678 أو +20 10...)',
    })
    .optional(),
  city: z.string().optional(),
  preferredPitchType: z.string().optional(),
  avatar: z.string().optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'], {
    errorMap: () => ({ message: 'الحالة يجب أن تكون إما ACTIVE أو SUSPENDED' }),
  }),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'VENUE_OWNER', 'ADMIN'], {
    errorMap: () => ({ message: 'الدور يجب أن يكون USER أو VENUE_OWNER أو ADMIN' }),
  }),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1, 'معرف المستخدم مطلوب'),
});

export const getUsersQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
  role: z.enum(['USER', 'VENUE_OWNER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  search: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

