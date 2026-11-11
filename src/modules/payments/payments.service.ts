import { prisma } from '../../db/prisma';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { AuditLogService } from '../audit_logs/audit_logs.service';
import { NotificationService } from '../notifications/notifications.service';
import {
  GetTransactionsQuery,
  InitiatePaymentInput,
  VerifyPaymentInput,
} from './payments.schema';

export class PaymentService {
  static async initiatePayment(userId: string, input: InitiatePaymentInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { venue: true },
    });

    if (!booking) {
      throw new NotFoundError('الحجز غير موجود');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenError('لا تملك صلاحية دفع هذا الحجز');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('لا يمكن سداد حجز ملغي');
    }

    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestError('تم سداد هذا الحجز مسبقاً بالفعل');
    }

    const txRef = `TX-${booking.bookingReference}-${Date.now().toString().slice(-4)}`;

    let instructions = '';
    let targetAccount = '';

    if (input.paymentMethod === 'INSTAPAY') {
      targetAccount = 'playbook@instapay';
      instructions = 'يرجى تحويل المبلغ عبر تطبيق إنستاباي إلى معرف: playbook@instapay مع كتابة رقم الحجز في خانة الملاحظات.';
    } else if (input.paymentMethod === 'VODAFONE_CASH') {
      targetAccount = '01099887766';
      instructions = 'يرجى تحويل المبلغ إلى محفظة فودافون كاش رقم: 01099887766 ثم تأكيد العملية بكود التحويل.';
    } else {
      targetAccount = 'PlayBook Secured Gateway';
      instructions = 'بوابة دفع البطاقات البنكية المؤمنة عبر ميزة والفيزا والماستركارد.';
    }

    const transaction = await prisma.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        userId,
        amount: booking.totalAmount,
        currency: 'EGP',
        paymentMethod: input.paymentMethod,
        provider: input.paymentMethod,
        transactionReference: txRef,
        status: 'PENDING',
        gatewayResponse: JSON.stringify({
          targetAccount,
          instructions,
          initiatedAt: new Date().toISOString(),
        }),
      },
    });

    // Update booking payment method
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentMethod: input.paymentMethod },
    });

    return {
      transactionReference: txRef,
      amount: booking.totalAmount,
      currency: 'EGP',
      paymentMethod: input.paymentMethod,
      targetAccount,
      instructions,
      booking: {
        id: booking.id,
        reference: booking.bookingReference,
        venueName: booking.venueName,
        pitchName: booking.pitchName,
        date: booking.date,
        displayTime: booking.displayTime,
      },
    };
  }

  static async simulateVerifyPayment(userId: string, userRole: string, input: VerifyPaymentInput) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { transactionReference: input.transactionReference },
      include: {
        booking: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundError('المعاملة المالية غير موجودة');
    }

    if (userRole !== 'ADMIN' && transaction.userId !== userId) {
      throw new ForbiddenError('غير مسموح لك بإتمام أو التحقق من هذه المعاملة');
    }

    const isSuccess = input.status === 'SUCCESS';

    const updatedTx = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        gatewayResponse: JSON.stringify({
          verifiedAt: new Date().toISOString(),
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          confirmationCode: input.confirmationCode || 'SIMULATED-AUTH-OK',
        }),
      },
    });

    if (isSuccess) {
      // Mark booking as PAID
      await prisma.booking.update({
        where: { id: transaction.bookingId },
        data: { paymentStatus: 'PAID' },
      });

      // Send notifications to user and venue owner
      await Promise.all([
        NotificationService.createNotification(
          transaction.userId,
          'PAYMENT_SUCCESS',
          'تم تأكيد عملية الدفع بنجاح!',
          `تم سداد مبلغ ${transaction.amount} ج.م لحجزك رقم ${transaction.booking.bookingReference}. شكراً لك!`
        ),
        NotificationService.createNotification(
          transaction.booking.venue.ownerId,
          'PAYMENT_RECEIVED',
          'استلام دفعة جديدة!',
          `تم سداد مبلغ ${transaction.amount} ج.م لحجز الملعب ${transaction.booking.pitchName} ليوم ${transaction.booking.date}.`
        ),
        AuditLogService.log({
          userId,
          action: 'PAYMENT_VERIFIED_SUCCESS',
          entity: 'PaymentTransaction',
          entityId: transaction.id,
          details: {
            reference: transaction.transactionReference,
            bookingRef: transaction.booking.bookingReference,
            amount: transaction.amount,
            method: transaction.paymentMethod,
          },
        }),
      ]);
    }

    return {
      transaction: updatedTx,
      paymentStatus: isSuccess ? 'PAID' : 'FAILED',
      message: isSuccess
        ? 'تمت عملية الدفع بنجاح وتأكيد الحجز بالكامل'
        : 'فشلت عملية الدفع، يرجى المحاولة مرة أخرى أو اختيار طريقة دفع بديلة',
    };
  }

  static async getTransactions(userId: string, userRole: string, query: GetTransactionsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userRole === 'USER') {
      where.userId = userId;
    } else if (userRole === 'VENUE_OWNER') {
      where.booking = {
        venue: {
          ownerId: userId,
        },
      };
    }
    // ADMIN sees all

    if (query.status) where.status = query.status;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

    const [total, transactions] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              bookingReference: true,
              venueName: true,
              pitchName: true,
              date: true,
              displayTime: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTransactionById(id: string, userId: string, userRole: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            venue: true,
          },
        },
        user: true,
      },
    });

    if (!transaction) {
      throw new NotFoundError('المعاملة المالية غير موجودة');
    }

    if (userRole === 'USER' && transaction.userId !== userId) {
      throw new ForbiddenError('غير مسموح لك بالاطلاع على هذه المعاملة');
    }

    if (userRole === 'VENUE_OWNER' && transaction.booking.venue.ownerId !== userId) {
      throw new ForbiddenError('غير مسموح لك بالاطلاع على هذه المعاملة');
    }

    return transaction;
  }
}

