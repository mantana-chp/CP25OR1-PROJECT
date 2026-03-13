import { ZodError } from 'zod';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean = true;
  public readonly errors?: Array<{ message: string; path?: string[]; code?: number }>;

  constructor(message: string, statusCode: number = 500, errors?: Array<{ message: string; path?: string[]; code?: number }>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "Bad Request", errors?: Array<{ message: string; path?: string[]; code?: number }>) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = "Conflict", errors?: Array<{ message: string; path?: string[]; code?: number }>) {
    super(message, 409, errors);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Not Found") {
    super(message, 404);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export const formatZodError = (error: ZodError) => {
  return error.issues.map(err => ({
    message: err.message,
    path: err.path.map(p => p.toString()),
    code: 400, // zod is always a bad request
  }));
};