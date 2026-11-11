import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response';

interface ValidationTargets {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validate = (schemas: ValidationTargets) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendError(res, 'بيانات غير صالحة، يرجى مراجعة الحقول المطلوبة', 400, formattedErrors);
        return;
      }
      next(error);
    }
  };
};

