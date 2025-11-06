
import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { sendError } from '../shared/response';

export const validate = (schema: ZodObject<any>) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path.map(p => String(p)), // Convert PropertyKey[] to string[]
      }));
      return sendError(res, 400, 'Validation failed', formattedErrors);
    }
    next(error);
  }
};
