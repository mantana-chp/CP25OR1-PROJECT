import { Request, Response, NextFunction } from 'express';
import { ApiError, formatZodError } from '../shared/errors';
import { ZodError } from 'zod';
import { logger } from '../libs/logger';
import { Prisma } from '../generated/prisma/client';
import { sendError } from '../shared/response';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    logger.warn(`Validation Error for ${req.method} ${req.originalUrl}:`, err);
    return sendError(res, 400, 'Validation Failed', formatZodError(err));
  }

  if (err instanceof ApiError) {
    logger.warn(`API Error for ${req.method} ${req.originalUrl}:`, err);
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const field = (err.meta?.target as string[])?.join(', ');
    const message = `A resource with the same value for the field(s): ${field} already exists.`;
    logger.warn(`Prisma Unique Constraint Error (P2002) for ${req.method} ${req.originalUrl}:`, err);
    return sendError(res, 409, 'Conflict', [{ message, code: 409 }]);
  }

  // Fallback for any other errors
  logger.error(`Internal Server Error for ${req.method} ${req.originalUrl}:`, err);
  return sendError(res, 500, 'internal server error');
};
