import { z } from 'zod';

export const getAuditLogsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
  action: z.string().optional(),
  entity: z.string().optional(),
  userId: z.string().optional(),
});

export type GetAuditLogsQuery = z.infer<typeof getAuditLogsQuerySchema>;

