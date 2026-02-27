import app from './app';
import { logger } from './libs/logger';
import { minioClient } from './libs/minio-client';
import { startSchedulers as startReminderScheduler } from './jobs/reminder-scheduler';
import { startNotificationScheduler } from './jobs/notification-scheduler';

const PORT = process.env.PORT || 3000;

// Initialize MinIO (non-blocking: server starts even if MinIO is unavailable)
minioClient.initialize()
  .then(() => {
    logger.info('MinIO connected successfully');
  })
  .catch((error) => {
    logger.warn('MinIO initialization failed - file upload features will not work:', error as Error);
  });

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);

  // Start the background jobs
  startReminderScheduler();
  startNotificationScheduler();
});
