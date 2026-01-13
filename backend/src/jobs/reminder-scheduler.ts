import cron from 'node-cron';
import { logger } from '../libs/logger';
import { updateOverdueReminders } from '../features/reminders/reminder-service';

const reminderJob = cron.schedule('*/15 * * * *', async () => { // job run every 15 min
  logger.info('Running job: Checking for overdue reminders...');
  try {
    await updateOverdueReminders();
    logger.info('Finished job: Checking for overdue reminders.');
  } catch (error: unknown) { // Explicitly type as unknown
    if (error instanceof Error) {
      logger.error('Error running overdue reminder job:', error);
    } else {
      logger.error('Error running overdue reminder job:', new Error(String(error)));
    }
  }
});

export const startSchedulers = () => {
  reminderJob.start();
  logger.info('Started reminder scheduler. (every 15 min)');
};
