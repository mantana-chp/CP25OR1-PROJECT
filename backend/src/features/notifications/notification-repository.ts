import prisma from '../../libs/db';
import { Prisma } from '../../generated/prisma/client';

export const findManyByUserId = async (userId: string, isRead?: boolean) => {
  const where: Prisma.notificationsWhereInput = {
    user_id: userId,
  };

  // If the isRead filter is provided, add it to the where clause
  if (isRead !== undefined) {
    where.read_at = isRead ? { not: null } : null;
  }

  return await prisma.notifications.findMany({
    where,
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const findById = async (id: string) => {
  return await prisma.notifications.findUnique({
    where: { id },
  });
};

export const update = async (id: string, data: Prisma.notificationsUpdateInput) => {
  return await prisma.notifications.update({
    where: { id },
    data,
  });
};

export const create = async (data: Prisma.notificationsCreateInput) => {
  return await prisma.notifications.create({
    data,
  });
};
