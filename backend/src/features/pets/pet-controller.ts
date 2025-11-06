import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as petService from './pet-service';
import { sendSuccess } from '../../shared/response';

export const createPet = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const petData = req.body;

  const newPet = await petService.createPet(userId, petData);

  sendSuccess(res, newPet, 201);
});
