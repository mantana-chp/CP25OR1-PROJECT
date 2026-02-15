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
}, {
  timezone: 'Etc/UTC' // Explicitly use UTC timezone
});

export const startSchedulers = () => {
  reminderJob.start();
  
  const now = new Date();
  const nowUTC = now.toISOString();
  
  logger.info('========================================');
  logger.info('📅 Reminder Overdue Scheduler Started');
  logger.info('========================================');
  logger.info(`Current time: ${nowUTC} (UTC)`);
  logger.info('Schedule: */15 * * * * (every 15 minutes, UTC)');
  logger.info('Description: Updates reminder status to "overdue" when past due date/time');
  logger.info('========================================');
};
