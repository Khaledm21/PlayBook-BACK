import { Router } from 'express';
import { VenueController } from './venues.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadVenueImages } from '../../middleware/upload';
import {
  createVenueSchema,
  getVenuesQuerySchema,
  updateVenueSchema,
  venueIdParamSchema,
} from './venues.schema';

const router = Router();

// Public routes
router.get('/', validate({ query: getVenuesQuerySchema }), VenueController.getVenues);

// Venue Owner's venues
router.get(
  '/my',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  VenueController.getMyVenues
);

// Specific venue details
router.get('/:id', VenueController.getVenueById);

// Protected routes (Owner / Admin)
router.post(
  '/',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ body: createVenueSchema }),
  VenueController.createVenue
);

router.put(
  '/:id',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ params: venueIdParamSchema, body: updateVenueSchema }),
  VenueController.updateVenue
);

router.delete(
  '/:id',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ params: venueIdParamSchema }),
  VenueController.deleteVenue
);

router.post(
  '/:id/images',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ params: venueIdParamSchema }),
  uploadVenueImages,
  VenueController.uploadImages
);

export const venueRoutes = router;

