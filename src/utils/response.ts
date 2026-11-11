import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
  errors?: any[];
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
  pagination?: PaginationMeta
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    payload.message = message;
  }

  if (pagination) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: any[]
): Response => {
  const payload: ApiResponse = {
    success: false,
    message,
  };

  if (errors && errors.length > 0) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

