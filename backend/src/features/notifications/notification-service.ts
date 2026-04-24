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
 * Notifications are fanned out to both the pet owner and any active caregivers.
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
      notifications: { orderBy: { created_at: 'desc' } }, // Include to check retry attempts per user
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

  // Filter in-memory to find reminders that are within the send time window.
  // Per-user retry/skip logic is handled inside the recipient loop below.
  const dueReminders = candidateReminders.filter(reminder => {
    // Skip parent reminders (reminders that have children)
    if (reminder.children && reminder.children.length > 0) {
      logger.info(`[NotificationJob] Skipping parent reminder ${reminder.id} (has ${reminder.children.length} children).`);
      return false;
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

    // Grace period: allow sending up to 60 minutes after the reminder time
    const gracePeriodMs = 60 * 60 * 1000;
    const withinGracePeriod = now <= new Date(reminderActualTimeUTC.getTime() + gracePeriodMs);

    return notificationTimeReached && withinGracePeriod;
  });

  if (dueReminders.length === 0) {
    logger.info('[NotificationJob] No reminders are currently due for processing after time-based filtering.');
    logger.info('--- FINISHED NOTIFICATION JOB ---');
    return;
  }

  logger.info(`[NotificationJob] Found ${dueReminders.length} reminders that are actually due for notification: [${dueReminders.map(r => r.id).join(', ')}]`);

  for (const reminder of dueReminders) {
    const petName = reminder.pets?.pet_name;
    const reminderName = reminder.reminder_name;

    // Fetch active caregivers for this pet
    const caregiverAccess = await prisma.pet_user_access.findMany({
      where: { pet_id: reminder.pet_id, revoked_at: null, role: 'CAREGIVER' },
      include: { user: { include: { push_tokens: true } } },
    });

    // Build the full recipient list: owner first, then caregivers
    const recipients = [
      { userId: reminder.user_id, pushTokens: reminder.user.push_tokens },
      ...caregiverAccess.map(a => ({ userId: a.user_id, pushTokens: a.user.push_tokens })),
    ];

    for (const recipient of recipients) {
      // Per-user: find this recipient's existing notification for this reminder
      const userNotifications = reminder.notifications.filter(n => n.user_id === recipient.userId);

      // Skip if already successfully sent to this user
      if (userNotifications.some(n => n.status === 'sent')) {
        logger.info(`[NotificationJob] Skipping user ${recipient.userId} for reminder ${reminder.id} (already sent).`);
        continue;
      }

      // Per-user retry check
      const failedNotification = userNotifications.find(n => n.status === 'failed' || n.status === 'pending');
      const retryCount = failedNotification?.retry_count ?? 0;
      const isRetry = retryCount > 0;

      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        logger.warn(`[NotificationJob] Skipping user ${recipient.userId} for reminder ${reminder.id} (max retries: ${retryCount}/${MAX_RETRY_ATTEMPTS}).`);
        continue;
      }

      if (isRetry && failedNotification) {
        const timeSinceLastAttempt = now.getTime() - new Date(failedNotification.created_at!).getTime();
        if (timeSinceLastAttempt < RETRY_INTERVAL_MS) {
          continue; // Too soon to retry
        }
        logger.info(`[NotificationJob] Retry attempt #${retryCount + 1} for user ${recipient.userId}, reminder ${reminder.id}.`);
      }

      logger.info(`[NotificationJob] Processing reminder ${reminder.id} for user ${recipient.userId}${isRetry ? ` (retry #${retryCount + 1})` : ''}...`);

      // Check required data
      if (!petName || !reminderName) {
        logger.error(`[NotificationJob] Skipping reminder ${reminder.id}: Missing required data. Marking as failed.`);
        if (failedNotification) {
          await notificationRepository.update(failedNotification.id, { status: notification_status.failed, sent_at: null });
        } else {
          await notificationRepository.create({
            id: uuidv4(), status: notification_status.failed, retry_count: 0,
            user: { connect: { id: recipient.userId } },
            reminders: { connect: { id: reminder.id } },
            sent_at: null,
          });
        }
        continue;
      }

      // Reuse existing notification or create new one
      let notificationToProcess;
      if (isRetry && failedNotification) {
        notificationToProcess = failedNotification;
        logger.info(`[NotificationJob] Reusing existing notification ${notificationToProcess.id} for retry.`);
        await notificationRepository.update(notificationToProcess.id, {
          status: notification_status.pending,
          retry_count: retryCount + 1,
        });
      } else {
        notificationToProcess = await notificationRepository.create({
          id: uuidv4(),
          status: notification_status.pending,
          retry_count: 0,
          user: { connect: { id: recipient.userId } },
          reminders: { connect: { id: reminder.id } },
        });
      }

      let finalStatus: notification_status = notification_status.sent;
      let sentAt: Date | null = new Date();
      const messagesToSend: PushMessage[] = [];

      if (recipient.pushTokens && recipient.pushTokens.length > 0) {
        for (const token of recipient.pushTokens) {
          messagesToSend.push({
            to: token.token,
            sound: 'default',
            title: `เตือนความจำ: ${reminderName}`,
            body: `ถึงเวลาของน้อง ${petName} แล้วนะ`,
            data: { reminderId: reminder.id, notificationId: notificationToProcess.id },
          });
        }
      } else {
        logger.info(`[NotificationJob] No push tokens for user ${recipient.userId}. Notification ${notificationToProcess.id} saved for in-app only.`);
      }

      if (messagesToSend.length > 0) {
        try {
          logger.info(`[NotificationJob] Sending ${messagesToSend.length} push notifications for notification ID: ${notificationToProcess.id}${isRetry ? ` (retry #${retryCount + 1})` : ''}`);
          await expoPushService.send(messagesToSend);
          logger.info(`[NotificationJob] Successfully sent push notifications for ${notificationToProcess.id}.`);
        } catch (error: unknown) {
          logger.error(
            `[NotificationJob] Failed to send push for notification ${notificationToProcess.id} (attempt ${retryCount + 1}):`,
            error instanceof Error ? error : new Error(String(error))
          );
          finalStatus = notification_status.failed;
          sentAt = null;

          if (retryCount + 1 >= MAX_RETRY_ATTEMPTS - 1) {
            logger.warn(`[NotificationJob] ⚠️ Reminder ${reminder.id} / user ${recipient.userId} has failed ${retryCount + 1} times.`);
          }
        }
      }

      await notificationRepository.update(notificationToProcess.id, { status: finalStatus, sent_at: sentAt });
      logger.info(`[NotificationJob] Marked notification ${notificationToProcess.id} as ${finalStatus}.`);
    }
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

/**
 * Sends a status-change notification to everyone involved with a reminder EXCEPT the actor.
 * Called when toggleReminderStatus() is used (fire-and-forget).
 *
 * Actor label rules:
 *   owner → caregiver:   "โดย เจ้าของ"
 *   caregiver → owner:   "โดย [alias from owner_caregiver_contacts]"
 *   caregiver → caregiver: "โดย ผู้ดูแลอีกคน"
 */
export const sendStatusChangeNotification = async (
  actorUserId: string,
  reminderId: string,
  petId: string,
  reminderName: string,
  newStatus: string,
): Promise<void> => {
  try {
    const statusTh =
      newStatus === 'done' ? 'เสร็จแล้ว' :
        newStatus === 'overdue' ? 'เลยกำหนด' : 'รอดำเนินการ';

    // Get pet owner id
    const pet = await prisma.pets.findUnique({ where: { id: petId }, select: { user_id: true } });
    if (!pet) return;
    const ownerId = pet.user_id;

    // Get all active caregivers with contact info for alias lookup
    const caregiverAccess = await prisma.pet_user_access.findMany({
      where: { pet_id: petId, revoked_at: null, role: 'CAREGIVER' },
      include: {
        contact: true, // owner_caregiver_contacts — has .alias
        user: { include: { push_tokens: true } },
      },
    });

    const actorIsOwner = actorUserId === ownerId;

    interface Recipient {
      userId: string;
      actorLabel: string;
      pushTokens: { token: string }[];
    }

    const recipients: Recipient[] = [];

    // Add owner as recipient (only if owner is not the actor)
    if (!actorIsOwner) {
      const actorAccess = caregiverAccess.find(a => a.user_id === actorUserId);
      const actorAlias = actorAccess?.contact?.alias ?? 'ผู้ดูแล';
      const ownerWithTokens = await prisma.users.findUnique({
        where: { id: ownerId },
        include: { push_tokens: true },
      });
      if (ownerWithTokens) {
        recipients.push({
          userId: ownerId,
          actorLabel: `โดย ${actorAlias}`,
          pushTokens: ownerWithTokens.push_tokens,
        });
      }
    }

    // Add caregivers as recipients (excluding the actor)
    for (const access of caregiverAccess) {
      if (access.user_id === actorUserId) continue;
      recipients.push({
        userId: access.user_id,
        actorLabel: actorIsOwner ? 'โดย เจ้าของ' : 'โดย ผู้ดูแลอีกคน',
        pushTokens: access.user.push_tokens,
      });
    }

    if (recipients.length === 0) {
      logger.info(`[StatusChangeNotification] No other recipients for reminder ${reminderId}.`);
      return;
    }

    for (const recipient of recipients) {
      const message = `${reminderName} ถูกเปลี่ยนสถานะเป็น ${statusTh} แล้วว ${recipient.actorLabel}`;

      const notification = await notificationRepository.create({
        id: uuidv4(),
        status: notification_status.pending,
        user: { connect: { id: recipient.userId } },
        reminders: { connect: { id: reminderId } },
        tips_title: message,
        sent_at: null,
      });

      let finalStatus: notification_status = notification_status.sent;
      let sentAt: Date | null = new Date();

      if (recipient.pushTokens.length > 0) {
        const messages: PushMessage[] = recipient.pushTokens.map(t => ({
          to: t.token,
          sound: 'default',
          title: message,
          body: message,
          data: { reminderId, notificationId: notification.id },
        }));
        try {
          await expoPushService.send(messages);
          logger.info(`[StatusChangeNotification] Push sent to user ${recipient.userId} for reminder ${reminderId}.`);
        } catch (error: unknown) {
          logger.error(
            `[StatusChangeNotification] Failed to send push for notification ${notification.id}:`,
            error instanceof Error ? error : new Error(String(error))
          );
          finalStatus = notification_status.failed;
          sentAt = null;
        }
      } else {
        logger.info(`[StatusChangeNotification] No push tokens for user ${recipient.userId}. In-app only.`);
      }

      await notificationRepository.update(notification.id, { status: finalStatus, sent_at: sentAt });
    }
  } catch (error) {
    // Non-blocking: log but never throw — must not break toggleReminderStatus
    logger.error('[StatusChangeNotification] Unexpected error:', error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Sends a health insight notification to pet owner and all active caregivers.
 * Called by the health insight detection cron job.
 *
 * @param petId The ID of the pet the insight is about
 * @param insightId The ID of the health_insights record
 * @param title The insight notification title (includes emoji based on severity)
 * @param description The insight description/explanation
 */
export const sendHealthInsightNotification = async (
  petId: string,
  insightId: string,
  title: string,
  description: string,
): Promise<void> => {
  try {
    logger.info(`[HealthInsightNotification] Preparing notification for insight ${insightId}, pet ${petId}`);

    // Get pet owner
    const pet = await prisma.pets.findUnique({
      where: { id: petId },
      include: {
        user: { include: { push_tokens: true } },
      },
    });

    if (!pet) {
      logger.error(`[HealthInsightNotification] Pet ${petId} not found`);
      return;
    }

    // Get all active caregivers
    const caregiverAccess = await prisma.pet_user_access.findMany({
      where: { pet_id: petId, revoked_at: null, role: 'CAREGIVER' },
      include: { user: { include: { push_tokens: true } } },
    });

    // Build recipient list: owner + caregivers
    const recipients = [
      { userId: pet.user_id, pushTokens: pet.user.push_tokens },
      ...caregiverAccess.map(a => ({ userId: a.user_id, pushTokens: a.user.push_tokens })),
    ];

    logger.info(`[HealthInsightNotification] Sending to ${recipients.length} recipients (owner + ${caregiverAccess.length} caregivers)`);

    for (const recipient of recipients) {
      let finalStatus: notification_status = notification_status.sent;
      let sentAt: Date | null = new Date();

      // Create notification record
      const notification = await notificationRepository.create({
        id: uuidv4(),
        status: notification_status.pending,
        user: { connect: { id: recipient.userId } },
        pet: { connect: { id: petId } },
        health_insight: { connect: { id: insightId } },
        tips_title: title,
        tips_desc: description,
      });

      const messagesToSend: PushMessage[] = [];

      if (recipient.pushTokens && recipient.pushTokens.length > 0) {
        for (const token of recipient.pushTokens) {
          messagesToSend.push({
            to: token.token,
            sound: 'default',
            title: title,
            body: description,
            data: { petId, healthInsightId: insightId, notificationId: notification.id },
          });
        }
      } else {
        logger.info(`[HealthInsightNotification] No push tokens for user ${recipient.userId}. Notification ${notification.id} saved for in-app only.`);
      }

      // Send push notifications if any were prepared
      if (messagesToSend.length > 0) {
        try {
          logger.info(`[HealthInsightNotification] Sending ${messagesToSend.length} push notifications for notification ID: ${notification.id}`);
          await expoPushService.send(messagesToSend);
          logger.info(`[HealthInsightNotification] Push notifications sent successfully for ${notification.id}.`);
        } catch (error: unknown) {
          logger.error(
            `[HealthInsightNotification] Failed to send push for notification ${notification.id}:`,
            error instanceof Error ? error : new Error(String(error))
          );
          finalStatus = notification_status.failed;
          sentAt = null;
        }
      }

      // Update notification to final state
      await notificationRepository.update(notification.id, {
        status: finalStatus,
        sent_at: sentAt,
      });
      logger.info(`[HealthInsightNotification] Marked notification ${notification.id} as ${finalStatus}.`);
    }

    logger.info(`[HealthInsightNotification] Completed notification delivery for insight ${insightId}`);
  } catch (error) {
    logger.error('[HealthInsightNotification] Unexpected error:', error instanceof Error ? error : new Error(String(error)));
  }
};
