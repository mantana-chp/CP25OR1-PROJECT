import * as petRepository from './pet-repository';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { Prisma } from '../../generated/prisma/client';
import { formatAgeFromBirthDate } from '../../shared/utils';

export type PetCreationData = {
  pet_name: string;
  species_id: string;
  breed_id?: string | null;
  gender: 'male' | 'female' | 'unknown';
  weight?: number | null;
  birth_date?: string | null;
};

// Helper function to format a single pet profile into the desired structure
const formatPetProfile = (pet: any) => {
  if (!pet) return null;

  return {
    id: pet.id,
    name: pet.pet_name,
    gender: pet.gender,
    species: pet.species?.name_th || null,
    breed: pet.breeds?.name_th || null,
    age: formatAgeFromBirthDate(pet.birth_date),
    weight: pet.weight ? String(pet.weight) : null,
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

export const getAllPetProfilesForUser = async (userId: string) => {
  const pets = await petRepository.findAllPetProfilesByUserId(userId);

  if (!pets || pets.length === 0) {
    return [];
  }

  return pets.map(formatPetProfile);
};

export const getPetProfileById = async (petId: string, userId: string) => {
  const pet = await petRepository.findPetProfileByPetId(petId, userId);

  if (!pet) {
    throw new NotFoundError('Pet not found or does not belong to this user.');
  }

  return formatPetProfile(pet);
};
