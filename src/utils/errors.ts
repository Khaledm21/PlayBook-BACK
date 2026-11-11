export class AppError extends Error {
  public statusCode: number;
  public errors?: any[];

  constructor(message: string, statusCode = 500, errors?: any[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'طلب غير صالح', errors?: any[]) {
    super(message, 400, errors);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'غير مصرح لك بالوصول، يرجى تسجيل الدخول') {
    super(message, 410); // will use 401
    this.statusCode = 401;
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'العنصر المطلوب غير موجود') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'يوجد تعارض مع بيانات مسجلة مسبقاً') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

