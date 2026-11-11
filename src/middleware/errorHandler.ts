import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If headers already sent, delegate to default express error handler
  if (res.headersSent) {
    return _next(err);
  }

  // 1. Handled AppError (BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, etc.)
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // 2. Zod Validation Error (in case thrown directly)
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'خطأ في التحقق من صحة البيانات المدخلة', 400, formattedErrors);
    return;
  }

  // 3. Prisma Error Codes
  if (err.code === 'P2002') {
    const target = err.meta?.target || 'الحقل';
    sendError(res, `يوجد تعارض: القيمة المدخلة في (${target}) مسجلة مسبقاً`, 409);
    return;
  }

  if (err.code === 'P2025') {
    sendError(res, 'العنصر المطلوب غير موجود في قاعدة البيانات', 404);
    return;
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'رمز التوثيق (Token) غير صالح أو تالف', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 'انتهت صلاحية رمز التوثيق، يرجى إعادة تسجيل الدخول أو التجديد', 401);
    return;
  }

  // 5. Multer File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    sendError(res, 'حجم الملف المرفوع يتجاوز الحد المسموح به (5 ميجابايت)', 400);
    return;
  }

  if (err.message && err.message.includes('نوع الملف غير مدعوم')) {
    sendError(res, err.message, 400);
    return;
  }

  // 6. Generic Internal Server Error
  console.error('Unhandled Application Error:', err);
  sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً'
      : err.message || 'خطأ غير متوقع في الخادم',
    500
  );
};

