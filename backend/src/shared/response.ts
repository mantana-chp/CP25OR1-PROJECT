import { Response } from 'express';
import { ApiResponse, ApiErrorResponse } from './types';
import { API_RESPONSE_STATUS } from './constants';

/**
 * @param res The Express response object.
 * @param data The data payload to send.
 * @param statusCode The HTTP status code to send (defaults to 200).
 */
export const sendSuccess = <T>(res: Response, data: T, statusCode: number = 200) => {
  const response: ApiResponse<T> = {
    status: {
      code: API_RESPONSE_STATUS.SUCCESS.CODE,
      description: API_RESPONSE_STATUS.SUCCESS.DESCRIPTION,
    },
    data: data,
  };
  res.status(statusCode).json(response);
};

/**
 * @param res The Express response object.
 * @param statusCode The HTTP status code to send.
 * @param description The top-level error description.
 * @param errors An optional array of specific error details.
 */
export const sendError = (
  res: Response,
  statusCode: number,
  description: string,
  errors?: Array<{ message: string; path?: string[]; code?: number }>
) => {
  const errorResponse: ApiErrorResponse = {
    status: {
      code: API_RESPONSE_STATUS.FAILURE.CODE,
      description: description,
    },
    errors: errors,
  };
  res.status(statusCode).json(errorResponse);
};
