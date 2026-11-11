import { z } from 'zod';

export const createReviewSchema = z.object({
  venueId: z.string().min(1, 'معرف الملعب مطلوب'),
  bookingId: z.string().optional(),
  rating: z.number().min(1).max(5, 'التقييم يجب أن يكون بين 1 و 5 نجوم'),
  pitchQuality: z.number().min(1).max(5).optional(),
  cleanliness: z.number().min(1).max(5).optional(),
  staff: z.number().min(1).max(5).optional(),
  lighting: z.number().min(1).max(5).optional(),
  comment: z.string().min(5, 'التعليق يجب أن لا يقل عن 5 أحرف'),
});

export const replyReviewSchema = z.object({
  replyComment: z.string().min(3, 'رد إدارة الملعب مطلوب ويجب أن لا يقل عن 3 أحرف'),
});

export const getReviewsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 20)),
});

export const reviewIdParamSchema = z.object({
  id: z.string().min(1, 'معرف التقييم مطلوب'),
});

export const venueReviewsParamSchema = z.object({
  venueId: z.string().min(1, 'معرف الملعب مطلوب'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>;
export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;

