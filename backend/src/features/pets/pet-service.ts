import * as petRepository from './pet-repository';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors';
import { Prisma } from '../../generated/prisma/client';
import { type PetUpdatePayload } from './pet-schema';
import { formatAgeFromBirthDate } from '../../shared/utils';
import { generateDownloadUrl, deleteFile } from '../file-uploads/upload-service';

export type PetCreationData = {
  pet_name: string;
  species_id: string;
  breed_id?: string | null;
  gender: 'male' | 'female' | 'unknown';
  weight?: number | null;
  birth_date?: string | null;
};

const formatPetProfile = async (pet: any) => {
  if (!pet) return null;

  // Generate presigned URL for profile image if it exists
  let profileImageUrl = null;
  if (pet.profile_image_key) {
    try {
      profileImageUrl = await generateDownloadUrl(pet.profile_image_key, 3600);
    } catch (error) {
      // If image is missing, set to null
      profileImageUrl = null;
    }
  }

  return {
    id: pet.id,
    pet_name: pet.pet_name,
    gender: pet.gender,
    birth_date: pet.birth_date,
    weight: pet.weight,
    species_id: pet.species_id,
    species: pet.species?.name_th || null,
    breed_id: pet.breed_id,
    breed: pet.breeds?.name_th || null,
    age: pet.birth_date ? formatAgeFromBirthDate(pet.birth_date) : null,
    profile_image_url: profileImageUrl,
  };
};

export const createPet = async (userId: string, petData: PetCreationData) => {
  const petCount = await petRepository.countByUserId(userId);
  if (petCount >= 10) {
    throw new ConflictError('You have reached the maximum limit of 10 pets.');
  }

  const data: Prisma.petsCreateInput = {
    pet_name: petData.pet_name,
    gender: petData.gender,
    weight: petData.weight,
    birth_date: petData.birth_date ? new Date(petData.birth_date) : null,
    user: { connect: { id: userId } },
    species: { connect: { id: petData.species_id } },
    ...(petData.breed_id && { breeds: { connect: { id: petData.breed_id } } }),
  };

  return await petRepository.create(data);
};

export const updatePet = async (petId: string, userId: string, petData: PetUpdatePayload) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId);
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.');
  }

  const updateData: Prisma.petsUpdateInput = {};

  if (petData.pet_name != null) {
    updateData.pet_name = petData.pet_name;
  }
  if (petData.gender != null) {
    updateData.gender = petData.gender;
  }
  if (petData.weight != null) {
    updateData.weight = petData.weight;
  }
  if (petData.birth_date != null) {
    updateData.birth_date = petData.birth_date ? new Date(petData.birth_date) : null;
  }
  if (petData.species_id != null) {
    updateData.species = { connect: { id: petData.species_id } };
  }
  if (petData.breed_id != null) {
    updateData.breeds = { connect: { id: petData.breed_id } };
  }

  if (Object.keys(updateData).length === 0) {
    throw new BadRequestError('Request body must contain at least one valid field to update.');
  }

  return await petRepository.update(petId, userId, updateData);

  // return await getPetProfileById(petId, userId);
};

export const getAllPetProfilesForUser = async (userId: string) => {
  const pets = await petRepository.findAllPetProfilesByUserId(userId);

  if (!pets || pets.length === 0) {
    return [];
  }

  return Promise.all(pets.map(formatPetProfile));
};

export const getPetProfileById = async (petId: string, userId: string) => {
  const pet = await petRepository.findPetProfileByPetId(petId, userId);

  if (!pet) {
    throw new NotFoundError('Pet not found or does not belong to this user.');
  }

  return formatPetProfile(pet);
};

/**
 * Update pet profile picture
 * @param petId - Pet ID
 * @param userId - User ID (for authorization)
 * @param objectKey - MinIO object key for the new profile image
 */
export const updatePetProfileImage = async (
  petId: string,
  userId: string,
  objectKey: string
) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId);
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.');
  }

  // Delete old profile image if it exists
  if (existingPet.profile_image_key) {
    try {
      await deleteFile(existingPet.profile_image_key);
    } catch (error) {
      // Log but don't fail if old image deletion fails
      console.error('Failed to delete old profile image:', error);
    }
  }

  // Update with new profile image key
  const updateData: Prisma.petsUpdateInput = {
    profile_image_key: objectKey,
  };

  await petRepository.update(petId, userId, updateData);

  return getPetProfileById(petId, userId);
};

/**
 * Delete pet profile picture
 * @param petId - Pet ID
 * @param userId - User ID (for authorization)
 */
export const deletePetProfileImage = async (petId: string, userId: string) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId);
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.');
  }

  if (!existingPet.profile_image_key) {
    throw new BadRequestError('Pet does not have a profile image.');
  }

  // Delete from MinIO
  await deleteFile(existingPet.profile_image_key);

  // Remove from database
  const updateData: Prisma.petsUpdateInput = {
    profile_image_key: null,
  };

  await petRepository.update(petId, userId, updateData);

  return getPetProfileById(petId, userId);
};
