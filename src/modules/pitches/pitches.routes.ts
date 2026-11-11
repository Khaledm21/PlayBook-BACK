import { Router } from 'express';
import { PitchController } from './pitches.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPitchSchema,
  pitchIdParamSchema,
  updatePitchSchema,
  venueIdParamSchema,
} from './pitches.schema';

const router = Router();

// Public pitch queries
router.get(
  '/venue/:venueId',
  validate({ params: venueIdParamSchema }),
  PitchController.getPitchesByVenue
);

router.get(
  '/:id',
  validate({ params: pitchIdParamSchema }),
  PitchController.getPitchById
);

// Protected Pitch Management (Owner / Admin)
router.post(
  '/',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ body: createPitchSchema }),
  PitchController.createPitch
);

router.put(
  '/:id',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ params: pitchIdParamSchema, body: updatePitchSchema }),
  PitchController.updatePitch
);

router.delete(
  '/:id',
  authenticateToken,
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ params: pitchIdParamSchema }),
  PitchController.deletePitch
);

export const pitchRoutes = router;

