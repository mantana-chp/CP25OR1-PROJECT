import prisma from '../../libs/db';

export const findAllByUserId = async (userId: string) => {
  return await prisma.reminders.findMany({
    where: {
      user_id: userId,
      is_health: true,
      parent_id: null,
    },
    include: {
      pets: true, // Include pet data to get the pet's name
      children: true, // Include children for health records
    },
    orderBy: {
      reminder_date: 'desc', // Order by most recent first
    },
  });
};

/**
 * Fetch health records for all pets the user can access (owned + shared as caregiver).
 */
export const findAllByAccessiblePets = async (userId: string) => {
  return await prisma.reminders.findMany({
    where: {
      is_health: true,
      parent_id: null,
      OR: [
        { pets: { user_id: userId } },
        { pets: { user_access: { some: { user_id: userId, revoked_at: null } } } },
      ],
    },
    include: {
      pets: true,
      children: true,
    },
    orderBy: {
      reminder_date: 'desc',
    },
  });
};
