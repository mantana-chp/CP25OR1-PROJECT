import cron from 'node-cron';
import { logger } from '../libs/logger';
import { processAndSendNotifications } from '../features/notifications/notification-service';
import { generateAndSendAITips } from '../services/ai-tip-generation-service';

// Main job for processing and sending scheduled notifications (e.g., reminders)
const notificationJob = cron.schedule('*/15 * * * *', async () => {
  logger.info('Running job: Processing and sending scheduled reminder notifications...');
  try {
    await processAndSendNotifications();
    logger.info('Finished job: Processing and sending scheduled reminder notifications.');
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error running reminder notification processing job:', error);
    } else {
      logger.error('Error running reminder notification processing job:', new Error(String(error)));
    }
  }
});

// New job for generating and sending personalized AI tips in batches
const aiTipNotificationJob = cron.schedule('0 13 * * *', async () => {
  // Runs daily at 13:00 UTC (20:00 Bangkok time)
  logger.info('Running job: Generating and sending personalized AI tips...');
  try {
    await generateAndSendAITips();
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error running AI tip notification job:', error);
    } else {
      logger.error('Error running AI tip notification job:', new Error(String(error)));
    }
  }
});

export const startNotificationScheduler = () => {
  notificationJob.start();
  aiTipNotificationJob.start();
  logger.info('Started reminder notification scheduler (runs every 15 min).');
  logger.info('Started AI tip notification scheduler (runs daily at 20:00 Bangkok time).');
};
