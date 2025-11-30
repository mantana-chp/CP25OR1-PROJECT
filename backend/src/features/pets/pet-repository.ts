import prisma from '../../libs/db';
import { Prisma } from '../../generated/prisma/client';

export const findFirstByUserId = async (userId: string) => {
  return await prisma.pets.findFirst({
    where: { user_id: userId },
  });
};

export const create = async (data: Prisma.petsCreateInput) => {
  return await prisma.pets.create({
    data,
  });
};

export const findPetProfileByUserId = async (userId: string) => {
  return await prisma.pets.findFirst({
    where: { user_id: userId },
    select: {
      id: true,
      pet_name: true,
      gender: true,
      birth_date: true,
      weight: true,
      species: {
        select: {
          name_th: true,
          description_th: true,
        },
      },
      breeds: {
        select: {
          name_th: true,
          description_th: true,
        },
      },
    },
  });
};
