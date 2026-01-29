import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as petService from './pet-service';
import { sendSuccess } from '../../shared/response';
import { createPetSchema, getPetByIdSchema } from './pet-schema';

export const createPet = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const petData = createPetSchema.parse(req).body;

  const newPet = await petService.createPet(userId, petData);

  sendSuccess(res, newPet, 201);
});

export const getAllPetProfilesController = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!;
  const petProfiles = await petService.getAllPetProfilesForUser(userId);
  sendSuccess(res, petProfiles);
});

export const getPetProfileByIdController = asyncHandler(async (req: Request, res: Response) => {
  const { id: petId } = getPetByIdSchema.parse(req).params;
  const { id: userId } = req.user!;
  const petProfile = await petService.getPetProfileById(petId, userId);
  sendSuccess(res, [petProfile]);
});