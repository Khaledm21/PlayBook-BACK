import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from './audit_logs.service';
import { sendSuccess } from '../../utils/response';
import { GetAuditLogsQuery } from './audit_logs.schema';

export class AuditLogController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as GetAuditLogsQuery;
      const result = await AuditLogService.getLogs(query);

      return sendSuccess(
        res,
        result.logs,
        200,
        'تم استرجاع سجلات الرقابة بنجاح',
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }
}

