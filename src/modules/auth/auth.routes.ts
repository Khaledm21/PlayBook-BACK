import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticateToken } from '../../middleware/auth';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from './auth.schema';

const router = Router();

router.post(
  '/register',
  validate({ body: registerSchema }),
  AuthController.register
);

router.post(
  '/login',
  validate({ body: loginSchema }),
  AuthController.login
);

router.post(
  '/refresh-token',
  validate({ body: refreshTokenSchema }),
  AuthController.refreshToken
);

router.post(
  '/logout',
  authenticateToken,
  AuthController.logout
);

router.get(
  '/me',
  authenticateToken,
  AuthController.getMe
);

export const authRoutes = router;

