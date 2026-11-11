import { Router } from 'express';
import { UserController } from './users.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadAvatar } from '../../middleware/upload';
import {
  getUsersQuerySchema,
  updateProfileSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './users.schema';

const router = Router();

router.use(authenticateToken);

// Current user profile
router.put(
  '/profile',
  validate({ body: updateProfileSchema }),
  UserController.updateProfile
);

router.post(
  '/avatar',
  uploadAvatar,
  UserController.uploadAvatar
);

// Admin-only endpoints
router.get(
  '/',
  requireRoles('ADMIN'),
  validate({ query: getUsersQuerySchema }),
  UserController.getUsers
);

router.get(
  '/:id',
  requireRoles('ADMIN'),
  validate({ params: userIdParamSchema }),
  UserController.getUserById
);

router.patch(
  '/:id/status',
  requireRoles('ADMIN'),
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  UserController.updateStatus
);

router.patch(
  '/:id/role',
  requireRoles('ADMIN'),
  validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
  UserController.updateRole
);

export const userRoutes = router;

