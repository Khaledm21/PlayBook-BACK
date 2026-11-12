import { z } from 'zod';
import { isFlexibleEgyptianPhone } from '../../utils/phone';

export const registerSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن لا يقل عن حرفين'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  phone: z
    .string()
    .min(8, 'رقم الهاتف يجب أن يتكون من 8 أرقام على الأقل')
    .refine((val) => isFlexibleEgyptianPhone(val), {
      message: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678 أو +20 10...)',
    }),
  password: z.string().min(6, 'كلمة المرور يجب أن لا تقل عن 6 أحرف'),
  role: z.enum(['USER', 'VENUE_OWNER']).default('USER'),
  city: z.string().optional(),
  preferredPitchType: z.string().optional(),
});

export const loginSchema = z.object({
  emailOrPhone: z.string().min(3, 'البريد الإلكتروني أو رقم الهاتف مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'الـ Refresh Token مطلوب'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string().min(6, 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

