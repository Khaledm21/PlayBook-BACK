import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  bookingId: z.string().min(1, 'معرف الحجز مطلوب'),
  paymentMethod: z.enum(['INSTAPAY', 'VODAFONE_CASH', 'CREDIT_CARD'], {
    errorMap: () => ({ message: 'طريقة الدفع يجب أن تكون INSTAPAY أو VODAFONE_CASH أو CREDIT_CARD' }),
  }),
});

export const verifyPaymentSchema = z.object({
  transactionReference: z.string().min(1, 'الرقم المرجعي للمعاملة مطلوب'),
  status: z.enum(['SUCCESS', 'FAILED']).default('SUCCESS'),
  confirmationCode: z.string().optional(),
});

export const getTransactionsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 20)),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']).optional(),
  paymentMethod: z.string().optional(),
});

export const transactionIdParamSchema = z.object({
  id: z.string().min(1, 'معرف المعاملة مطلوب'),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;

