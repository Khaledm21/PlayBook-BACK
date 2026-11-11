import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payments.service';
import { sendSuccess } from '../../utils/response';
import {
  GetTransactionsQuery,
  InitiatePaymentInput,
  VerifyPaymentInput,
} from './payments.schema';

export class PaymentController {
  static async initiatePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const body = req.body as InitiatePaymentInput;
      const result = await PaymentService.initiatePayment(userId, body);

      return sendSuccess(res, result, 201, 'تم تجهيز بيانات الدفع بنجاح');
    } catch (error) {
      next(error);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const body = req.body as VerifyPaymentInput;
      const result = await PaymentService.simulateVerifyPayment(userId, userRole, body);

      return sendSuccess(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const query = req.query as unknown as GetTransactionsQuery;
      const result = await PaymentService.getTransactions(userId, userRole, query);

      return sendSuccess(res, result.transactions, 200, 'تم استرجاع سجل المعاملات المالية', result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getTransactionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const result = await PaymentService.getTransactionById(id, userId, userRole);

      return sendSuccess(res, result, 200, 'تم استرجاع تفاصيل المعاملة بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

