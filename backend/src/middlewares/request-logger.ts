import { Request, Response, NextFunction } from 'express';
import { logger } from '../libs/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const endpoint = `${req.method} ${req.originalUrl}`;

  logger.info(`[Request Start] ${endpoint}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[Request End] ${endpoint} - Status: ${res.statusCode} - Duration: ${duration}ms`);
  });

  next();
};
