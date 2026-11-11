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

export const reviewRoutes = router;

