import prisma from '../../libs/db';
import { Prisma } from '../../generated/prisma/client';

const petProfileSelect = {
  id: true,
  pet_name: true,
  gender: true,
  birth_date: true,
  weight: true,
  species_id: true,
  breed_id: true,
};

export const create = async (data: Prisma.petsCreateInput) => {
  return await prisma.pets.create({
    data,
  });
};

export const countByUserId = async (userId: string): Promise<number> => {
  return await prisma.pets.count({
    where: { user_id: userId },
  });
};

export const findAllPetProfilesByUserId = async (userId: string) => {
  return await prisma.pets.findMany({
    where: { user_id: userId },
    select: petProfileSelect,
    orderBy: {
      created_at: 'asc',
    },
  });
};

export const findPetProfileByPetId = async (petId: string, userId: string) => {
  return await prisma.pets.findFirst({
    where: {
      id: petId,
      user_id: userId,
    },
    select: petProfileSelect,
  });
};

export const update = async (petId: string, userId: string, data: Prisma.petsUpdateInput) => {
  return await prisma.pets.update({
    where: {
      id: petId,
      user_id: userId,
    },
    data,
  });
};
