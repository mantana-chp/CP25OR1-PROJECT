import app from './app';
import { logger } from './libs/logger';
import { startSchedulers as startReminderScheduler } from './jobs/reminder-scheduler';
import { startNotificationScheduler } from './jobs/notification-scheduler';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);

  // Start the background jobs
  startReminderScheduler();
  startNotificationScheduler();
});
