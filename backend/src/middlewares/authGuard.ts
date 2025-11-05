import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../shared/errors';

interface TokenPayload {
  userId: string;
  installationId: string;
}

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const xInstallationId = req.headers['x-installation-id'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  if (!xInstallationId) {
    return next(new UnauthorizedError('X-Installation-Id header missing'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

    if (decoded.installationId !== xInstallationId) {
      return next(new UnauthorizedError('Invalid token for this installation'));
    }

    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid token'));
  }
};
