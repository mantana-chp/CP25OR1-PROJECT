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
