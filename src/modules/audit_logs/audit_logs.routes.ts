import { Router } from 'express';
import { AuditLogController } from './audit_logs.controller';
import { authenticateToken, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getAuditLogsQuerySchema } from './audit_logs.schema';

const router = Router();

router.get(
  '/',
  authenticateToken,
  requireRoles('ADMIN'),
  validate({ query: getAuditLogsQuerySchema }),
  AuditLogController.getLogs
);

export const auditLogRoutes = router;

