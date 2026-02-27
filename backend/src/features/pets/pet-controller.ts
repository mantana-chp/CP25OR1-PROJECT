import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import * as petService from './pet-service';
import { sendSuccess } from '../../shared/response';
import {
  createPetSchema,
  getPetByIdSchema,
  updatePetSchema,
  updatePetProfileImageSchema,
  deletePetProfileImageSchema,
} from './pet-schema';

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
  sendSuccess(res, petProfile);
});

export const updatePetController = asyncHandler(async (req: Request, res: Response) => {
  const { params, body: petData } = updatePetSchema.parse(req);
  const { id: petId } = params;
  const { id: userId } = req.user!;
  const updatedPet = await petService.updatePet(petId, userId, petData);
  sendSuccess(res, updatedPet);
});

export const updatePetProfileImageController = asyncHandler(async (req: Request, res: Response) => {
  const { params, body } = updatePetProfileImageSchema.parse(req);
  const { id: petId } = params;
  const { objectKey } = body;
  const { id: userId } = req.user!;

  const updatedPet = await petService.updatePetProfileImage(petId, userId, objectKey);
  sendSuccess(res, updatedPet);
});

export const deletePetProfileImageController = asyncHandler(async (req: Request, res: Response) => {
  const { params } = deletePetProfileImageSchema.parse(req);
  const { id: petId } = params;
  const { id: userId } = req.user!;

  const updatedPet = await petService.deletePetProfileImage(petId, userId);
  sendSuccess(res, updatedPet);
});