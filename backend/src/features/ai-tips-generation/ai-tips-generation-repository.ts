import prisma from '../../libs/db';
import { logger } from '../../libs/logger';

/**
 * Fetches users who are eligible for a tip notification today.
 * Eligibility criteria:
 * - User must have at least one pet.
 * - User must not have received any other notification today (reminder or tip).
 * @returns A list of objects, each containing a userId and a randomly selected pet.
 */
export const getEligibleUsersForTip = async () => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Find user IDs who already have a notification today
  const usersWithRecentNotifications = await prisma.notifications.findMany({
    where: {
      created_at: {
        gte: startOfDay,
        lte: endOfDay,
      },
      OR: [{ reminder_id: { not: null } }, { tips_title: { not: null } }],
    },
    select: { user_id: true },
    distinct: ['user_id'],
  });

  const ineligibleUserIds = usersWithRecentNotifications.map(n => n.user_id);

  // Find users who are not in the ineligible list and have at least one pet
  const eligibleUsers = await prisma.users.findMany({
    where: {
      id: {
        notIn: ineligibleUserIds,
      },
      pets: {
        some: {},
      },
    },
    include: {
      pets: {
        include: {
          species: true,
          breeds: true,
        },
      },
    },
  });

  // For each eligible user, randomly select one pet
  const usersWithRandomPet = eligibleUsers.map(user => {
    const randomPetIndex = Math.floor(Math.random() * user.pets.length);
    const selectedPet = user.pets[randomPetIndex];
    return {
      userId: user.id,
      pet: selectedPet,
    };
  });

  logger.info(`[AITipsRepository] Found ${usersWithRandomPet.length} eligible users for AI tips.`);

  return usersWithRandomPet;
};
