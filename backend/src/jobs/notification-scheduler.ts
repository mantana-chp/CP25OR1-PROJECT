import cron from 'node-cron';
import { logger } from '../libs/logger';
import { processAndSendNotifications, sendTipNotification } from '../features/notifications/notification-service';
import prisma from '../libs/db';
import { generatePersonalizedTip } from '../services/ai-tip-generation-service';

// Main job for processing and sending scheduled notifications (e.g., reminders)
const notificationJob = cron.schedule('*/15 * * * *', async () => { // 3 mins for demo **normally its 15mins
  logger.info('Running job: Processing and sending notifications...');
  try {
    await processAndSendNotifications();
    logger.info('Finished job: Processing and sending notifications.');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error running notification processing job:', error);
    } else {
      logger.error('Error running notification processing job:', new Error(String(error)));
    }
  }
});

// New job for generating and sending personalized AI tips
const aiTipNotificationJob = cron.schedule('0 2 * * *', async () => { // Daily at 9 AM GMT+7 (2 AM UTC)
  logger.info('Running job: Generating and sending personalized AI tips...');
  try {
    await processAndSendTipNotification();
    logger.info('Finished job: Generating and sending personalized AI tips.');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error running AI tip notification job:', error);
    } else {
      logger.error('Error running AI tip notification job:', new Error(String(error)));
    }
  }
});

export const processAndSendTipNotification = async () => {
  // 1. Get all active users with their pets
  const activeUsers = await prisma.users.findMany({
    where: {
      status: 'active',
    },
    include: { // Changed from 'select' to 'include'
      pets: {
        include: { // Nested include for relations
          species: true,
          breeds: true,
        },
      },
    },
  });

  if (activeUsers.length === 0) {
    logger.info('No active users found to send AI tips.');
    return;
  }

  // 2. Select a random user
  const randomUserIndex = Math.floor(Math.random() * activeUsers.length);
  const selectedUser = activeUsers[randomUserIndex];

  if (selectedUser.pets.length === 0) {
    logger.info(`User ${selectedUser.id} has no pets. Skipping AI tip generation.`);
    return;
  }

  // 3. Select a random pet for the selected user
  const randomPetIndex = Math.floor(Math.random() * selectedUser.pets.length);
  const selectedPet = selectedUser.pets[randomPetIndex];

  logger.info(`Selected user ${selectedUser.id} and pet ${selectedPet.pet_name} (${selectedPet.id}) for AI tip generation.`);

  // 4. Generate AI tip
  const { title, description } = await generatePersonalizedTip(selectedPet);

  // 5. Send tip notification (this function needs to be implemented in notification-service)
  await sendTipNotification(selectedUser.id, selectedPet.id, title, description);
};

/**
 * Generates and sends a personalized AI tip notification for a specific user.
 * @param userId The ID of the user to process.
 */
export const processAndSendTipNotificationForUser = async (userId: string) => {
  logger.info(`[Manual Trigger] Processing AI tip for specific user: ${userId}`);

  const user = await prisma.users.findUnique({
    where: { id: userId, status: 'active' },
    include: {
      pets: {
        include: {
          species: true,
          breeds: true,
        },
      },
    },
  });

  if (!user) {
    logger.warn(`[Manual Trigger] User ${userId} not found or is not active.`);
    return;
  }

  if (user.pets.length === 0) {
    logger.info(`[Manual Trigger] User ${user.id} has no pets. Skipping AI tip generation.`);
    return;
  }

  // Select a random pet for the user
  const randomPetIndex = Math.floor(Math.random() * user.pets.length);
  const selectedPet = user.pets[randomPetIndex];

  logger.info(`[Manual Trigger] Selected pet ${selectedPet.pet_name} (${selectedPet.id}) for AI tip generation.`);

  // Generate AI tip
  const { title, description } = await generatePersonalizedTip(selectedPet);

  // Send tip notification
  await sendTipNotification(user.id, selectedPet.id, title, description);
};

export const startNotificationScheduler = () => {
  notificationJob.start();
  aiTipNotificationJob.start(); // Start the new AI tip job
  logger.info('Started notification scheduler (every 15 min).');
  logger.info('Started AI tip notification scheduler (every 9am daily).');
};
