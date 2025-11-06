import * as petRepository from './pet-repository';
import { ConflictError } from '../../shared/errors';
import { Prisma } from '../../generated/prisma/client';

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
    ...(petData.breed_id && { breeds: { connect: { id: petData.breed_id } } }), // Conditionally connect breed
  };

  return await petRepository.create(data);
};
