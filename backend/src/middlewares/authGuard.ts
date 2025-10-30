import { Request, Response, NextFunction } from 'express';
import { UserPayload } from '../shared/types';

// mock auth for prep for authentication
export const authGuard = (req: Request, res: Response, next: NextFunction) => {

  const mockUser: UserPayload = {
    id: '11111111-1111-1111-1111-111111111111',
  };

  req.user = mockUser;

  next();
};
