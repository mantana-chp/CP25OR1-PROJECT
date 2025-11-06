import { Request, Response, NextFunction } from 'express';
import { UserPayload } from '../shared/types';

// mock auth for prep for authentication
export const authGuard = (req: Request, res: Response, next: NextFunction) => {

  const mockUser: UserPayload = {
    id: 'fcbfd675-adc0-44c0-a6a4-d8cba2d6d179',
  };

  req.user = mockUser;

  next();
};
