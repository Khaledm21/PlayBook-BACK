import { Router } from 'express';
import { PaymentController } from './payments.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  getTransactionsQuerySchema,
  initiatePaymentSchema,
  transactionIdParamSchema,
  verifyPaymentSchema,
} from './payments.schema';

const router = Router();

router.use(authenticateToken);

router.post(
  '/initiate',
  validate({ body: initiatePaymentSchema }),
  PaymentController.initiatePayment
);

router.post(
  '/verify-simulate',
  validate({ body: verifyPaymentSchema }),
  PaymentController.verifyPayment
);

router.get(
  '/transactions',
  validate({ query: getTransactionsQuerySchema }),
  PaymentController.getTransactions
);

router.get(
  '/transactions/:id',
  validate({ params: transactionIdParamSchema }),
  PaymentController.getTransactionById
);

export const paymentRoutes = router;

