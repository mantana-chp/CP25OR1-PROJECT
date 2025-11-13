import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as petService from './pet-service';
import { sendSuccess } from '../../shared/response';
import { createPetSchema } from './pet-schema';

export const createPet = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const petData = createPetSchema.parse(req).body; // Use schema for parsing and validation

  const newPet = await petService.createPet(userId, petData);

  sendSuccess(res, [newPet], 201);
});

export const getPetProfileController = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const petProfile = await petService.getPetProfile(userId);
  sendSuccess(res, [petProfile]);
});