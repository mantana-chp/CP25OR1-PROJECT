import * as notificationRepository from './notification-repository'
import { ApiError, NotFoundError } from '../../shared/errors'
import prisma from '../../libs/db'
import { v4 as uuidv4 } from 'uuid'
import {
  expoPushService,
  PushMessage,
} from '../../services/expo-push-service'
import { logger } from '../../libs/logger'
import { notification_status } from '../../generated/prisma/client'
import { NotificationDto, NotificationWithRelations, mapPrismaNotificationToDto } from './notification-mapper'


export const getNotifications = async (userId: string, isRead?: boolean): Promise<NotificationDto[]> => {
  const notificationsFromDb: NotificationWithRelations[] = await notificationRepository.findManyByUserId(
    userId,
    isRead
  )

  return notificationsFromDb.map(mapPrismaNotificationToDto);
}

export const markAsRead = async (
  notificationId: string,
  userId: string,
  read: boolean
): Promise<NotificationDto> => {
  const notification = await notificationRepository.findById(notificationId)

  if (!notification) {
    throw new NotFoundError('Notification not found')
  }

  if (notification.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this notification' },
    ])
  }

  await notificationRepository.update(notificationId, {
    read_at: read ? new Date() : null,
  })

  // Fetch the updated notification with relations for mapping
  const updatedNotificationWithRelations = await notificationRepository.findByIdWithRelations(notificationId);

  if (!updatedNotificationWithRelations) {
    throw new Error('Failed to retrieve updated notification with relations.');
  }

  return mapPrismaNotificationToDto(updatedNotificationWithRelations);
}

/**
 * This is the core function called by the cron job.
 * It finds reminders that are nearly due and processes them just-in-time.
 */
export const processAndSendNotifications = async () => {
  logger.info('--- RUNNING NOTIFICATION JOB ---');
  const now = new Date();

  // Use UTC for all date comparisons to avoid timezone issues
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowUTC = new Date(todayUTC);
  tomorrowUTC.setUTCDate(todayUTC.getUTCDate() + 1);

  // Find all unnotified reminders scheduled for today (in UTC) that have not been notified yet.
  const candidateReminders = await prisma.reminders.findMany({
    where: {
      reminder_status: { in: ['to_do', 'overdue'] },
      notifications: { none: {} },
      reminder_date: {
        gte: todayUTC,
        lt: tomorrowUTC,
      },
    },
    include: {
      user: { include: { push_tokens: true } },
      pets: true,
    },
  });

  if (candidateReminders.length === 0) {
    logger.info('[NotificationJob] No unnotified candidate reminders found for today (UTC).');
    logger.info('--- FINISHED NOTIFICATION JOB ---');
    return;
  }

  const candidateIds = candidateReminders.map(r => r.id);
  logger.info(`[NotificationJob] Found ${candidateReminders.length} candidate reminders for today (UTC): [${candidateIds.join(', ')}]`);


  // Filter in-memory to find only the reminders that are actually due to be processed now
  const dueReminders = candidateReminders.filter(reminder => {
    let notificationSendTime: Date;
    const reminderDateUTC = reminder.reminder_date;

    if (reminder.reminder_time) {
      const reminderTimeUTC = reminder.reminder_time;
      // Combine date and time parts in UTC
      const combinedDateTime = new Date(Date.UTC(
        reminderDateUTC.getUTCFullYear(),
        reminderDateUTC.getUTCMonth(),
        reminderDateUTC.getUTCDate(),
        reminderTimeUTC.getUTCHours(),
        reminderTimeUTC.getUTCMinutes(),
        reminderTimeUTC.getUTCSeconds()
      ));
      notificationSendTime = new Date(combinedDateTime.getTime() - 30 * 60 * 1000);
    } else {
      // 9 AM GMT+7 is 2 AM UTC
      notificationSendTime = new Date(Date.UTC(
        reminderDateUTC.getUTCFullYear(),
        reminderDateUTC.getUTCMonth(),
        reminderDateUTC.getUTCDate(),
        2, 0, 0
      ));
    }
    return notificationSendTime <= now;
  });

  if (dueReminders.length === 0) {
    logger.info('[NotificationJob] No reminders are currently due for processing after time-based filtering.');
    logger.info('--- FINISHED NOTIFICATION JOB ---');
    return;
  }

  logger.info(`[NotificationJob] Found ${dueReminders.length} reminders that are actually due for notification.`);

  for (const reminder of dueReminders) {
    logger.info(`[NotificationJob] Processing reminder ${reminder.id}...`);

    const hasPushTokens = reminder.user.push_tokens && reminder.user.push_tokens.length > 0;
    const petName = reminder.pets?.pet_name;
    const reminderName = reminder.reminder_name;

    // Create the notification record first
    const newNotification = await notificationRepository.create({
      id: uuidv4(),
      status: notification_status.pending, // Start as pending
      user: { connect: { id: reminder.user_id } },
      reminders: { connect: { id: reminder.id } },
    });

    let finalStatus: notification_status = notification_status.sent;
    let sentAt: Date | null = new Date();
    const messagesToSend: PushMessage[] = [];

    // If user has tokens and data is valid, prepare push messages
    if (hasPushTokens && petName && reminderName) {
      for (const token of reminder.user.push_tokens) {
        messagesToSend.push({
          to: token.token,
          sound: 'default',
          title: `แจ้งเตือนน: ${reminderName}`,
          body: `ถึงเวลาของน้อง ${petName} แล้วว`,
          data: { reminderId: reminder.id, notificationId: newNotification.id },
        });
      }
    } else {
      logger.info(`[NotificationJob] Notification ${newNotification.id} will be processed for in-app only (no push tokens or missing data).`);
    }

    // Send push notifications if any were prepared
    if (messagesToSend.length > 0) {
      try {
        logger.info(`[NotificationJob] Sending ${messagesToSend.length} push notifications for notification ID: ${newNotification.id}`);
        await expoPushService.send(messagesToSend);
      } catch (error: unknown) {
        if (error instanceof Error) { // Type guard
          logger.error(`[NotificationJob] Failed to send push for notification ${newNotification.id}:`, error);
        } else {
          logger.error(`[NotificationJob] Failed to send push for notification ${newNotification.id}:`, new Error(String(error)));
        }
        finalStatus = notification_status.failed;
        sentAt = null;
      }
    }

    // Update the notification to its final state
    await notificationRepository.update(newNotification.id, {
      status: finalStatus,
      sent_at: sentAt,
    });
    logger.info(`[NotificationJob] Marked notification ${newNotification.id} as ${finalStatus}.`);
  }
  logger.info('--- FINISHED NOTIFICATION JOB ---');
};
