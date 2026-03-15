import { Request, Response } from 'express'
import { asyncHandler } from '../../shared/asyncHandler'
import * as petService from './pet-service'
import { sendSuccess } from '../../shared/response'
import {
  createPetSchema,
  createMultiplePetsSchema,
  getPetByIdSchema,
  updatePetSchema,
  updatePetProfileImageSchema,
  deletePetProfileImageSchema,
  softDeletePetSchema,
  getPetsQuerySchema,
  permanentDeletePetSchema,
  restorePetSchema,
} from './pet-schema'

export const createPet = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = req.user!
  const petData = createPetSchema.parse(req).body

  const newPet = await petService.createPet(userId, petData)

  sendSuccess(res, newPet, 201)
})

export const createMultiplePets = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.user!
    const { pets: petsData } = createMultiplePetsSchema.parse(req).body

    const newPets = await petService.createMultiplePets(userId, petsData)

    sendSuccess(res, newPets, 201)
  },
)

export const getAllPetProfilesController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.user!
    const { status } = getPetsQuerySchema.parse(req).query
    const petProfiles = await petService.getAllPetProfilesForUser(
      userId,
      status as any,
    )
    sendSuccess(res, petProfiles)
  },
)

export const getPetProfileByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: petId } = getPetByIdSchema.parse(req).params
    const { id: userId } = req.user!
    const petProfile = await petService.getPetProfileById(petId, userId)
    sendSuccess(res, petProfile)
  },
)

export const updatePetController = asyncHandler(
  async (req: Request, res: Response) => {
    const { params, body: petData } = updatePetSchema.parse(req)
    const { id: petId } = params
    const { id: userId } = req.user!
    const updatedPet = await petService.updatePet(petId, userId, petData)
    sendSuccess(res, updatedPet)
  },
)

export const updatePetProfileImageController = asyncHandler(
  async (req: Request, res: Response) => {
    const { params, body } = updatePetProfileImageSchema.parse(req)
    const { id: petId } = params
    const { objectKey } = body
    const { id: userId } = req.user!

    const updatedPet = await petService.updatePetProfileImage(
      petId,
      userId,
      objectKey,
    )
    sendSuccess(res, updatedPet)
  },
)

export const deletePetProfileImageController = asyncHandler(
  async (req: Request, res: Response) => {
    const { params } = deletePetProfileImageSchema.parse(req)
    const { id: petId } = params
    const { id: userId } = req.user!

    const updatedPet = await petService.deletePetProfileImage(petId, userId)
    sendSuccess(res, updatedPet)
  },
)

export const softDeletePetController = asyncHandler(
  async (req: Request, res: Response) => {
    const { params, body } = softDeletePetSchema.parse(req)
    const { id: petId } = params
    const { reason, deceased_date } = body
    const { id: userId } = req.user!

    const result = await petService.softDeletePet(
      petId,
      userId,
      reason,
      deceased_date,
    )
    sendSuccess(res, result)
  },
)

export const getPastPetsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.user!
    const pastPets = await petService.getPastPets(userId)
    sendSuccess(res, pastPets)
  },
)

export const getRecentlyDeletedPetsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.user!
    const deletedPets = await petService.getRecentlyDeletedPets(userId)
    sendSuccess(res, deletedPets)
  },
)

export const permanentDeletePetController = asyncHandler(
  async (req: Request, res: Response) => {
    const { params } = permanentDeletePetSchema.parse(req)
    const { id: petId } = params
    const { id: userId } = req.user!

    const result = await petService.permanentDeletePet(petId, userId)
    sendSuccess(res, result)
  },
)

export const restorePetController = asyncHandler(
  async (req: Request, res: Response) => {
    const { params } = restorePetSchema.parse(req)
    const { id: petId } = params
    const { id: userId } = req.user!

    const result = await petService.restorePet(petId, userId)
    sendSuccess(res, result)
  },
)
