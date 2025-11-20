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

export const getNotifications = async (userId: string, isRead?: boolean) => {
  const notificationsFromDb = await notificationRepository.findManyByUserId(
    userId,
    isRead
  )

  // Transform the data to match the frontend INotification domain
  // This maps the 'reminders' object from the DB to the 'reminder' field
  const notifications = notificationsFromDb.map((noti: any) => {
    const { reminders, ...rest } = noti
    return {
      ...rest,
      reminder: reminders,
    }
  })

  return notifications
}

export const markAsRead = async (
  notificationId: string,
  userId: string,
  read: boolean
) => {
  const notification = await notificationRepository.findById(notificationId)

  if (!notification) {
    throw new NotFoundError('Notification not found')
  }

  if (notification.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this notification' },
    ])
  }

  return await notificationRepository.update(notificationId, {
    read_at: read ? new Date() : null,
  })
}

/**
 * This is the core function called by the cron job. It finds reminders that need notifications,
 * including any that were missed, and sends them.
 */
export const processAndSendNotifications = async () => {
  const now = new Date()
  const messagesToSend: PushMessage[] = []
  const notificationIdsToUpdate: { [key: string]: string } = {} // Map push token to notification ID

  // Find all reminders that are 'to_do' or 'overdue' and do not have a notification record yet.
  const unnotifiedReminders = await prisma.reminders.findMany({
    where: {
      reminder_status: { in: ['to_do', 'overdue'] }, // Include overdue reminders
      notifications: {
        none: {}, // find reminders with no notification
      },
    },
    include: {
      user: { include: { push_tokens: true } },
      pets: true,
    },
  })

  if (unnotifiedReminders.length > 0) {
    logger.info(
      `[NotificationJob] Found ${unnotifiedReminders.length} reminders to process.`
    )
  }

  for (const reminder of unnotifiedReminders) {
    let notificationSendTime: Date

    if (reminder.reminder_time) {
      // Rule 1: For reminders with a specific time, notification is 30 mins before.
      const datePart = reminder.reminder_date.toISOString().split('T')[0]
      const timePart = reminder.reminder_time.toISOString().split('T')[1]
      const reminderDateTime = new Date(
        `${datePart}T${timePart.replace('Z', '+07:00')}`
      )
      notificationSendTime = new Date(
        reminderDateTime.getTime() - 30 * 60 * 1000
      )
    } else {
      // Rule 2: For reminders with no time, notification is at 10:00 AM GMT+7 on the due day.
      const datePart = reminder.reminder_date.toISOString().split('T')[0]
      notificationSendTime = new Date(`${datePart}T10:00:00+07:00`)
    }

    // Check if the calculated notification time is in the past.
    if (notificationSendTime <= now) {
      const newNotification = await createNotificationAndPreparePush(
        reminder,
        messagesToSend
      )
      if (newNotification && reminder.user.push_tokens.length > 0) {
        // Map ALL push tokens to this one notification ID
        for (const token of reminder.user.push_tokens) {
          notificationIdsToUpdate[token.token] = newNotification.id
        }
      }
    }
  }

  // Send all collected push notifications in one batch
  if (messagesToSend.length > 0) {
    logger.info(
      `[NotificationJob] Sending ${messagesToSend.length} push notifications via Expo service.`
    )
    const tickets = await expoPushService.send(messagesToSend)

    // Process tickets and update notification status
    for (const [index, ticket] of tickets.entries()) {
      const originalMessage = messagesToSend[index]
      const pushToken = originalMessage.to
      const notificationId = notificationIdsToUpdate[pushToken]

      if (notificationId) {
        if (ticket.status === 'ok') {
          await notificationRepository.update(notificationId, {
            status: notification_status.sent,
            sent_at: new Date(),
          })
          logger.info(
            `[NotificationJob] Notification ${notificationId} status updated to 'sent'.`
          )
        } else {
          await notificationRepository.update(notificationId, {
            status: notification_status.failed,
          })
          logger.error(
            `[NotificationJob] Notification ${notificationId} status updated to 'failed': ${ticket.message}`
          )
        }
      } else {
        logger.warn(
          `[NotificationJob] Could not find notificationId for token ${pushToken} in notificationIdsToUpdate map.`
        )
      }
    }
  }
}

/**
 * Helper function to create a notification record and add a push message to the queue.
 * @returns The newly created notification object.
 */
async function createNotificationAndPreparePush(
  reminder: any,
  messagesToSend: PushMessage[]
) {
  // The main query already filters for reminders with no notifications,
  // but this check provides an extra layer of safety against race conditions.
  const existingNotification = await prisma.notifications.findFirst({
    where: { reminder_id: reminder.id },
  })

  if (existingNotification) {
    return existingNotification // Return existing if found
  }

  const newNotification = await notificationRepository.create({
    id: uuidv4(),
    status: notification_status.pending, // Status is 'pending' until we confirm it's sent
    user: { connect: { id: reminder.user_id } },
    reminders: { connect: { id: reminder.id } },
  })

  logger.info(
    `[NotificationJob] Created in-app notification for reminder: ${reminder.reminder_name}`
  )

  if (reminder.user.push_tokens.length > 0) {
    for (const token of reminder.user.push_tokens) {
      logger.info(
        `[NotificationJob] Preparing push notification for token: ${token.token}`
      )
      messagesToSend.push({
        to: token.token,
        sound: 'default' as const,
        title: `แจ้งเตือนน: ${reminder.reminder_name}`,
        body: `ถึงเวลาของน้อง ${reminder.pets.pet_name} แล้วว`,
        data: { reminderId: reminder.id, notificationId: newNotification.id }, // Pass notificationId
      })
    }
  }
  return newNotification
}
