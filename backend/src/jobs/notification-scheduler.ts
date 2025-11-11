import cron from 'node-cron';
import { logger } from '../libs/logger';
import { processAndSendNotifications } from '../features/notifications/notification-service';


const notificationJob = cron.schedule('*/1 * * * *', async () => {
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

export const startNotificationScheduler = () => {
  notificationJob.start();
  logger.info('Started notification scheduler (every 15 min).');
};
