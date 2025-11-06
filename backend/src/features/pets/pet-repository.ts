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
