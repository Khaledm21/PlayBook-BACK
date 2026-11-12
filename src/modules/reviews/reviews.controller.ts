import { Request, Response, NextFunction } from 'express';
import { ReviewService } from './reviews.service';
import { sendSuccess } from '../../utils/response';
import { CreateReviewInput, GetReviewsQuery, ReplyReviewInput } from './reviews.schema';

export class ReviewController {
  static async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const body = req.body as CreateReviewInput;
      const review = await ReviewService.createReview(userId, body);

      return sendSuccess(res, review, 201, 'تم إضافة تقييمك بنجاح، شكراً لمشاركتك');
    } catch (error) {
      next(error);
    }
  }

  static async replyToReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;
      const isAdmin = req.user!.role === 'ADMIN';
      const body = req.body as ReplyReviewInput;
      const updated = await ReviewService.replyToReview(id, ownerId, isAdmin, body);

      return sendSuccess(res, updated, 200, 'تم إضافة رد إدارة الملعب بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async getVenueReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { venueId } = req.params;
      const query = req.query as unknown as GetReviewsQuery;
      const result = await ReviewService.getVenueReviews(venueId, query);

      return sendSuccess(res, result.reviews, 200, 'تم استرجاع تقييمات الملعب بنجاح', result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getAllReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReviewService.getAllReviews(req.query);
      return sendSuccess(res, result.reviews, 200, 'تم استرجاع قائمة التقييمات بنجاح', result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user!.userId;
      const updated = await ReviewService.updateStatus(id, status, adminId);
      return sendSuccess(res, updated, 200, 'تم تحديث حالة التقييم بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;
      await ReviewService.deleteReview(id, adminId);
      return sendSuccess(res, { success: true }, 200, 'تم حذف التقييم بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

