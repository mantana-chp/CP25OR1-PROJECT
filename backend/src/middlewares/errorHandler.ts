import { Request, Response, NextFunction } from 'express';
import { ApiError, formatZodError } from '../shared/errors';
import { ApiErrorResponse } from '../shared/types';
import { ZodError } from 'zod';
import { API_RESPONSE_STATUS } from '../shared/constants';
import { logger } from '../libs/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  let errorResponse: ApiErrorResponse = {
    status: {
      code: API_RESPONSE_STATUS.FAILURE.CODE,
      description: API_RESPONSE_STATUS.FAILURE.DESCRIPTION,
    },
  };

  if (err instanceof ZodError) {
    errorResponse.status.description = "Validation Failed";
    errorResponse.errors = formatZodError(err);
    logger.warn(`Validation Error for ${req.method} ${req.originalUrl}:`, err);
    return res.status(400).json(errorResponse);
  } else if (err instanceof ApiError) {
    errorResponse.status.description = err.message; // Use the ApiError's message as the main description
    errorResponse.errors = err.errors; // Pass through the errors array from ApiError
    logger.warn(`API Error for ${req.method} ${req.originalUrl}:`, err);
    return res.status(err.statusCode).json(errorResponse);
  } else if (err instanceof Error) {
    errorResponse.status.description = err.message;
    logger.error(`Internal Server Error for ${req.method} ${req.originalUrl}:`, err);
    return res.status(500).json(errorResponse);
  }

  // Fallback for any unhandled errors
  logger.error(`Unhandled Error for ${req.method} ${req.originalUrl}:`, err);
  return res.status(500).json(errorResponse);
};
