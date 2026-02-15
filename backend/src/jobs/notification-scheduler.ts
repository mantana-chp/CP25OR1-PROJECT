import cron from 'node-cron';
import { logger } from '../libs/logger';
import { processAndSendNotifications } from '../features/notifications/notification-service';
import { generateAndSendAITips } from '../features/ai-tips-generation/ai-tips-generation-service';

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
}, {
  timezone: 'Etc/UTC' // Explicitly use UTC timezone
});

// New job for generating and sending personalized AI tips in batches
// IMPORTANT: Cron schedule uses UTC time (explicitly set with timezone option)
// Schedule: 0 13 * * * = 13:00 UTC = 20:00 Asia/Bangkok (GMT+7)
// Server timezone: Asia/Bangkok (+07)
const aiTipNotificationJob = cron.schedule('0 13 * * *', async () => {
  const now = new Date();
  const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  logger.info(`Running job: Generating and sending personalized AI tips...`);
  logger.info(`Job triggered at: ${now.toISOString()} UTC | Bangkok time: ${bangkokTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
  try {
    await generateAndSendAITips();
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('Error running AI tip notification job:', error);
    } else {
      logger.error('Error running AI tip notification job:', new Error(String(error)));
    }
  }
}, {
  timezone: 'Etc/UTC' // Explicitly use UTC timezone to avoid confusion with server's local timezone
});

export const startNotificationScheduler = () => {
  notificationJob.start();
  aiTipNotificationJob.start();

  const now = new Date();
  const nowUTC = now.toISOString();
  const nowBangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  logger.info('========================================');
  logger.info('📅 Notification Schedulers Started');
  logger.info('========================================');
  logger.info(`Current time: ${nowUTC} (UTC) | ${nowBangkok} (Bangkok)`);
  logger.info('');
  logger.info('📌 Reminder Notifications:');
  logger.info('   Schedule: */15 * * * * (every 15 minutes)');
  logger.info('   Description: Checks for upcoming reminders and sends push notifications');
  logger.info('');
  logger.info('📌 AI Tips Notifications:');
  logger.info('   Schedule: 0 13 * * * (13:00 UTC daily)');
  logger.info('   Bangkok time: 20:00 (8:00 PM) daily');
  logger.info('   Description: Generates and sends personalized AI tips');
  logger.info('========================================');
};
