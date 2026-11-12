import { Router } from 'express';
import { ReviewController } from './reviews.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createReviewSchema,
  getReviewsQuerySchema,
  replyReviewSchema,
  reviewIdParamSchema,
  venueReviewsParamSchema,
} from './reviews.schema';

const router = Router();

// Public: get all reviews or filter by venueId
router.get('/', ReviewController.getAllReviews);

// Public: get venue reviews
router.get(
  '/venue/:venueId',
  validate({ params: venueReviewsParamSchema, query: getReviewsQuerySchema }),
  ReviewController.getVenueReviews
);

// Protected: create review
router.post(
  '/',
  authenticateToken,
  validate({ body: createReviewSchema }),
  ReviewController.createReview
);

// Protected: owner reply
router.post(
  '/:id/reply',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ params: reviewIdParamSchema, body: replyReviewSchema }),
  ReviewController.replyToReview
);

// Protected: admin update status
router.patch(
  '/:id/status',
  authenticateToken,
  requireRoles('ADMIN'),
  validate({ params: reviewIdParamSchema }),
  ReviewController.updateStatus
);

// Protected: admin delete review
router.delete(
  '/:id',
  authenticateToken,
  requireRoles('ADMIN'),
  validate({ params: reviewIdParamSchema }),
  ReviewController.deleteReview
);

export const reviewRoutes = router;

