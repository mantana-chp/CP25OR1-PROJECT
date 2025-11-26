import * as petRepository from './pet-repository';
import { ApiError, NotFoundError, ConflictError } from '../../shared/errors';
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

export const createPet = async (userId: string, petData: PetCreationData) => {
  const existingPet = await petRepository.findFirstByUserId(userId);
  if (existingPet) {
    throw new ConflictError('A pet profile for this user already exists.');
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

export const getPetProfile = async (userId: string) => {
  const pet = await petRepository.findPetProfileByUserId(userId);

  if (!pet) {
    throw new NotFoundError('Pet not found for this user.');
  }

  const age = formatAgeFromBirthDate(pet.birth_date);

  return {
    id: pet.id,
    name: pet.pet_name,
    gender: pet.gender,
    species: pet.species?.name,
    breed: pet.breeds?.name,
    age: age,
    weight: pet.weight,
  };
};
