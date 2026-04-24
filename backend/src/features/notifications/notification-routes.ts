import { Router } from 'express'
import {
  getNotifications,
  markAllNotificationsAsRead,
  updateNotification
} from './notification-controller'
import { authGuard } from '../../middlewares/authGuard'
import { validate } from '../../middlewares/validate'
import {
  getNotificationsSchema,
  updateNotificationSchema
} from './notification-schema'

const notificationRoutes = Router()

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get all notifications for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter notifications by their read status (true or false).
 *     responses:
 *       200:
 *         description: An array of notifications.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized.
 */
notificationRoutes.get(
  '/',
  authGuard,
  validate(getNotificationsSchema),
  getNotifications
)

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all unread notifications as read for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: Number of notifications updated.
 *       401:
 *         description: Unauthorized.
 */
notificationRoutes.patch('/read-all', authGuard, markAllNotificationsAsRead)

/**
 * @openapi
 * /notifications/{id}:
 *   patch:
 *     tags: [Notifications]
 *     summary: Update a notification's read status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the notification to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNotificationBody'
 *     responses:
 *       200:
 *         description: The updated notification object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Bad Request - Validation error.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Notification not found.
 */
notificationRoutes.patch(
  '/:id',
  authGuard,
  validate(updateNotificationSchema),
  updateNotification
)

export default notificationRoutes
