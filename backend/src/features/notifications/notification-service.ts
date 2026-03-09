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

  return Promise.all(notificationsFromDb.map(mapPrismaNotificationToDto));
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

  return await mapPrismaNotificationToDto(updatedNotificationWithRelations);
}

/**
 * This is the core function called by the cron job.
 * It finds reminders that are nearly due and processes them just-in-time.
 */
export const processAndSendNotifications = async () => {
  logger.info('--- RUNNING NOTIFICATION JOB ---');
  const now = new Date(); // Current time in UTC

  // Use UTC for all date comparisons to avoid timezone issues
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayAfterTomorrowUTC = new Date(todayUTC);
  dayAfterTomorrowUTC.setUTCDate(todayUTC.getUTCDate() + 2);

  // Find reminders for today or tomorrow that either:
  // 1. Have not been notified yet, OR
  // 2. Have failed/pending notifications (for retry)
  const candidateReminders = await prisma.reminders.findMany({
    where: {
      reminder_status: { in: ['to_do', 'overdue'] },
      reminder_date: {
        gte: todayUTC,
        lt: dayAfterTomorrowUTC,
      },
      pets: { status: 'ACTIVE' }, // Only process reminders for active pets
      OR: [
        // Reminders with no notifications yet
        { notifications: { none: {} } },
        // OR reminders with failed/pending notifications (for retry within grace period)
        {
          notifications: {
            some: {
              status: { in: ['failed', 'pending'] },
            },
          },
        },
      ],
    },
    include: {
      user: { include: { push_tokens: true } },
      pets: true,
      children: true,
      notifications: { orderBy: { created_at: 'desc' } }, // Include to check retry attempts
    },
  });

  if (candidateReminders.length === 0) {
    logger.info('[NotificationJob] No unnotified candidate reminders found for today/tomorrow.');
    logger.info('--- FINISHED NOTIFICATION JOB ---');
    return;
  }

  const candidateIds = candidateReminders.map(r => r.id);
  logger.info(`[NotificationJob] Found ${candidateReminders.length} candidate reminders for today/tomorrow: [${candidateIds.join(', ')}]`);

  // Configuration for retry logic
  const MAX_RETRY_ATTEMPTS = 5; // Maximum times to retry a failed notification
  const RETRY_INTERVAL_MS = 15 * 60 * 1000; // Wait at least 15 minutes between retries

  // Filter in-memory to find only the reminders that are actually due to be processed now
  const dueReminders = candidateReminders.filter(reminder => {
    // Skip parent reminders (reminders that have children)
    if (reminder.children && reminder.children.length > 0) {
      logger.info(`[NotificationJob] Skipping parent reminder ${reminder.id} (has ${reminder.children.length} children).`);
      return false;
    }

    // Check if already successfully notified
    const hasSuccessfulNotification = reminder.notifications?.some(n => n.status === 'sent');
    if (hasSuccessfulNotification) {
      logger.info(`[NotificationJob] Skipping reminder ${reminder.id} (already successfully notified).`);
      return false;
    }

    // Check retry attempts for failed/pending notifications
    const failedAttempts = reminder.notifications?.filter(n => n.status === 'failed' || n.status === 'pending') || [];
    const existingNotification = failedAttempts[0]; // Most recent (ordered by created_at desc)
    const retryCount = existingNotification?.retry_count || 0;

    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      logger.warn(`[NotificationJob] Skipping reminder ${reminder.id} (max retry attempts reached: ${retryCount}/${MAX_RETRY_ATTEMPTS}). Notification permanently failed.`);
      return false;
    }

    // If this is a retry, check if enough time has passed since last attempt
    if (retryCount > 0 && existingNotification) {
      const timeSinceLastAttempt = now.getTime() - new Date(existingNotification.created_at!).getTime();

      if (timeSinceLastAttempt < RETRY_INTERVAL_MS) {
        // Too soon to retry, wait longer
        return false;
      }

      logger.info(`[NotificationJob] Retry attempt #${retryCount + 1} for reminder ${reminder.id} (last attempt: ${Math.floor(timeSinceLastAttempt / 60000)} min ago).`);
    }

    let notificationSendTimeUTC: Date;
    let reminderActualTimeUTC: Date;

    if (reminder.reminder_time) {
      // IMPORTANT: reminder_time is stored as Asia/Bangkok local time (GMT+7)
      // We need to convert it to UTC for accurate comparison

      // Get the time part in milliseconds from the 1970-01-01 date
      const bangkokTimeMillis = reminder.reminder_time.getTime() - new Date('1970-01-01T00:00:00Z').getTime();

      // Convert Bangkok time to UTC by subtracting 7 hours (GMT+7 offset)
      const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
      const utcTimeMillis = bangkokTimeMillis - BANGKOK_OFFSET_MS;

      // Create the actual reminder time in UTC
      reminderActualTimeUTC = new Date(reminder.reminder_date.getTime() + utcTimeMillis);

      // Notification should be sent 30 minutes before the reminder time
      notificationSendTimeUTC = new Date(reminderActualTimeUTC.getTime() - 30 * 60 * 1000);
    } else {
      // For reminders without specific time: notify at 9 AM Bangkok (2 AM UTC)
      const reminderDateUTC = reminder.reminder_date;

      notificationSendTimeUTC = new Date(Date.UTC(
        reminderDateUTC.getUTCFullYear(),
        reminderDateUTC.getUTCMonth(),
        reminderDateUTC.getUTCDate(),
        2, 0, 0  // 2 AM UTC = 9 AM Bangkok
      ));

      reminderActualTimeUTC = new Date(Date.UTC(
        reminderDateUTC.getUTCFullYear(),
        reminderDateUTC.getUTCMonth(),
        reminderDateUTC.getUTCDate(),
        16, 59, 59  // 16:59:59 UTC = 23:59:59 Bangkok (same day)
      ));
    }

    // All comparisons now in UTC
    const notificationTimeReached = notificationSendTimeUTC <= now;
    const reminderNotYetOccurred = now < reminderActualTimeUTC;

    // Grace period: allow sending up to 60 minutes after the reminder time
    const gracePeriodMs = 60 * 60 * 1000;
    const withinGracePeriod = now <= new Date(reminderActualTimeUTC.getTime() + gracePeriodMs);

    const shouldCreateNotification = notificationTimeReached && (reminderNotYetOccurred || withinGracePeriod);

    // Uncomment for debugging:
    // logger.debug(`[NotificationJob] Reminder ${reminder.id}: notificationTime=${notificationSendTimeUTC.toISOString()}, reminderTime=${reminderActualTimeUTC.toISOString()}, now=${now.toISOString()}, shouldSend=${shouldCreateNotification}`);

    return shouldCreateNotification;
  });

  if (dueReminders.length === 0) {
    logger.info('[NotificationJob] No reminders are currently due for processing after time-based filtering.');
    logger.info('--- FINISHED NOTIFICATION JOB ---');
    return;
  }

  logger.info(`[NotificationJob] Found ${dueReminders.length} reminders that are actually due for notification: [${dueReminders.map(r => r.id).join(', ')}]`);

  for (const reminder of dueReminders) {
    const failedAttempts = reminder.notifications?.filter(n => n.status === 'failed' || n.status === 'pending') || [];
    const existingNotification = failedAttempts[0];
    const retryCount = existingNotification?.retry_count || 0;
    const isRetry = retryCount > 0;

    logger.info(`[NotificationJob] Processing reminder ${reminder.id}${isRetry ? ` (retry attempt #${retryCount + 1})` : ''}...`);

    const hasPushTokens = reminder.user.push_tokens && reminder.user.push_tokens.length > 0;
    const petName = reminder.pets?.pet_name;
    const reminderName = reminder.reminder_name;

    // Check if notification is fundamentally broken (missing required data)
    if (!petName || !reminderName) {
      logger.error(`[NotificationJob] Skipping reminder ${reminder.id}: Missing required data (petName: ${petName}, reminderName: ${reminderName}). Marking as failed.`);

      // Check if there's already a failed notification for this reminder
      if (existingNotification) {
        // Update existing notification to permanently failed
        await notificationRepository.update(existingNotification.id, {
          status: notification_status.failed,
          sent_at: null,
          retry_count: retryCount, // Keep current retry count
        });
      } else {
        // Create a failed notification to prevent infinite retries
        await notificationRepository.create({
          id: uuidv4(),
          status: notification_status.failed,
          retry_count: 0,
          user: { connect: { id: reminder.user_id } },
          reminders: { connect: { id: reminder.id } },
          sent_at: null,
        });
      }
      continue;
    }

    // Reuse existing notification or create new one
    let notificationToProcess;
    if (isRetry && existingNotification) {
      // Reuse the most recent failed/pending notification
      notificationToProcess = existingNotification;
      logger.info(`[NotificationJob] Reusing existing notification ${notificationToProcess.id} for retry.`);

      // Update status to pending and increment retry count before attempting
      await notificationRepository.update(notificationToProcess.id, {
        status: notification_status.pending,
        retry_count: retryCount + 1,
      });
    } else {
      // Create new notification for first attempt
      notificationToProcess = await notificationRepository.create({
        id: uuidv4(),
        status: notification_status.pending,
        retry_count: 0, // First attempt
        user: { connect: { id: reminder.user_id } },
        reminders: { connect: { id: reminder.id } },
      });
    }

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
          data: { reminderId: reminder.id, notificationId: notificationToProcess.id },
        });
      }
    } else {
      logger.info(`[NotificationJob] Notification ${notificationToProcess.id} will be processed for in-app only (no push tokens or missing data).`);
    }

    // Send push notifications if any were prepared
    if (messagesToSend.length > 0) {
      try {
        logger.info(`[NotificationJob] Sending ${messagesToSend.length} push notifications for notification ID: ${notificationToProcess.id}${isRetry ? ` (retry #${retryCount + 1})` : ''}`);
        await expoPushService.send(messagesToSend);
        logger.info(`[NotificationJob] Successfully sent push notifications for ${notificationToProcess.id}.`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error(`[NotificationJob] Failed to send push for notification ${notificationToProcess.id} (attempt ${retryCount + 1}):`, error);
        } else {
          logger.error(`[NotificationJob] Failed to send push for notification ${notificationToProcess.id} (attempt ${retryCount + 1}):`, new Error(String(error)));
        }
        finalStatus = notification_status.failed;
        sentAt = null;

        // Log warning if approaching max retries
        if (retryCount + 1 >= MAX_RETRY_ATTEMPTS - 1) {
          logger.warn(`[NotificationJob] ⚠️ Reminder ${reminder.id} has failed ${retryCount + 1} times. Will attempt ${MAX_RETRY_ATTEMPTS - retryCount - 1} more time(s) before permanent failure.`);
        }
      }
    } else if (!hasPushTokens) {
      // No push tokens but notification still created for in-app display
      logger.info(`[NotificationJob] No push tokens for user ${reminder.user_id}. Notification ${notificationToProcess.id} saved for in-app only.`);
    }

    // Update the notification to its final state
    await notificationRepository.update(notificationToProcess.id, {
      status: finalStatus,
      sent_at: sentAt,
    });
    logger.info(`[NotificationJob] Marked notification ${notificationToProcess.id} as ${finalStatus}.`);
  }

  logger.info('--- FINISHED NOTIFICATION JOB ---');
};

/**
 * Creates and sends a personalized AI-generated tip notification.
 * This function is called by the AI tip cron job.
 * @param userId The ID of the user to send the notification to.
 * @param petId The ID of the pet the tip is about.
 * @param title The title of the AI-generated tip.
 * @param description The description/body of the AI-generated tip.
 */
export const sendTipNotification = async (
  userId: string,
  petId: string,
  title: string,
  description: string,
): Promise<void> => {
  logger.info(`[TipNotification] Preparing AI tip notification for user ${userId}, pet ${petId}.`);
  let finalStatus: notification_status = notification_status.sent;
  let sentAt: Date | null = new Date();
  let newNotificationId: string = uuidv4(); // Generate UUID for the new notification

  try {
    // 1. Create the notification record in the database
    const newNotification = await notificationRepository.create({
      id: newNotificationId,
      status: notification_status.pending, // Start as pending
      user: { connect: { id: userId } },
      pet: { connect: { id: petId } }, // Connect to the pet
      tips_title: title,
      tips_desc: description,
    });
    newNotificationId = newNotification.id; // Ensure we use the ID returned by create

    // 2. Fetch user's push tokens
    const userWithTokens = await prisma.users.findUnique({
      where: { id: userId },
      include: { push_tokens: true },
    });

    const hasPushTokens = userWithTokens && userWithTokens.push_tokens && userWithTokens.push_tokens.length > 0;
    const messagesToSend: PushMessage[] = [];

    if (hasPushTokens) {
      for (const token of userWithTokens.push_tokens) {
        messagesToSend.push({
          to: token.token,
          sound: 'default',
          title: title,
          body: description,
          data: { notificationId: newNotificationId, petId: petId },
        });
      }
    } else {
      logger.info(`[TipNotification] Notification ${newNotificationId} will be processed for in-app only (no push tokens).`);
    }

    // 3. Send push notifications if any were prepared
    if (messagesToSend.length > 0) {
      try {
        logger.info(`[TipNotification] Sending ${messagesToSend.length} push notifications for notification ID: ${newNotificationId}`);
        await expoPushService.send(messagesToSend);
        logger.info(`[TipNotification] Push notifications sent successfully for ${newNotificationId}.`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error(`[TipNotification] Failed to send push for notification ${newNotificationId}:`, error);
        } else {
          logger.error(`[TipNotification] Failed to send push for notification ${newNotificationId}:`, new Error(String(error)));
        }
        finalStatus = notification_status.failed;
        sentAt = null;
      }
    }

  } catch (error) {
    logger.error(`[TipNotification] Error processing AI tip notification for user ${userId}, pet ${petId}:`, error as Error);
    finalStatus = notification_status.failed;
    sentAt = null;
  } finally {
    // 4. Update the notification to its final state
    await notificationRepository.update(newNotificationId, {
      status: finalStatus,
      sent_at: sentAt,
    });
    logger.info(`[TipNotification] Marked notification ${newNotificationId} as ${finalStatus}.`);
  }
};
