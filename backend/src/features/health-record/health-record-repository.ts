import prisma from '../../libs/db';

export const findAllByUserId = async (userId: string) => {
  return await prisma.reminders.findMany({
    where: {
      user_id: userId,
      is_health: true,
    },
    include: {
      pets: true, // Include pet data to get the pet's name
    },
    orderBy: {
      reminder_date: 'desc', // Order by most recent first
    },
  });
};
