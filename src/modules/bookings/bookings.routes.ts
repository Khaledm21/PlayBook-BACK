import { Router } from 'express';
import { BookingController } from './bookings.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  blockSlotIdParamSchema,
  blockSlotSchema,
  bookingIdParamSchema,
  createBookingSchema,
  getAvailabilityQuerySchema,
  getBookingsQuerySchema,
} from './bookings.schema';

const router = Router();

// 1. Live availability check (Public)
router.get(
  '/availability',
  validate({ query: getAvailabilityQuerySchema }),
  BookingController.getAvailability
);

// All following routes require authentication
router.use(authenticateToken);

// 2. Create Booking
router.post(
  '/',
  validate({ body: createBookingSchema }),
  BookingController.createBooking
);

// 3. List bookings
router.get(
  '/',
  validate({ query: getBookingsQuerySchema }),
  BookingController.getBookings
);

// 4. Booking details
router.get(
  '/:id',
  validate({ params: bookingIdParamSchema }),
  BookingController.getBookingById
);

// 5. Cancel booking
router.patch(
  '/:id/cancel',
  validate({ params: bookingIdParamSchema }),
  BookingController.cancelBooking
);

// 6. Block slot (Owner / Admin)
router.post(
  '/block-slot',
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ body: blockSlotSchema }),
  BookingController.blockSlot
);

// 7. Unblock slot (Owner / Admin)
router.delete(
  '/block-slot/:id',
  requireRoles('VENUE_OWNER', 'ADMIN'),
  validate({ params: blockSlotIdParamSchema }),
  BookingController.unblockSlot
);

export const bookingRoutes = router;

