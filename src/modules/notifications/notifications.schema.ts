import { z } from 'zod';

export const notificationIdParamSchema = z.object({
  id: z.string().min(1, 'معرف الإشعار مطلوب'),
});

export const getNotificationsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 20)),
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
