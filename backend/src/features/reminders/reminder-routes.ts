import { Router } from 'express'
import {
  getReminders,
  createReminder,
  createMultipleReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  toggleReminderStatus,
} from './reminder-controller'
import {
  requestAttachmentUrl,
  saveAttachment,
  deleteAttachment,
} from './reminder-attachment-controller'
import { authGuard } from '../../middlewares/authGuard'

const router = Router()

/**
 * @openapi
 * /reminders:
 *   get:
 *     tags: [Reminders]
 *     summary: Get all reminders for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: An array of reminders.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized.
 */
router.get('/', authGuard, getReminders)

/**
 * @openapi
 * /reminders/{id}:
 *   get:
 *     tags: [Reminders]
 *     summary: Get a specific reminder by its ID
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
 *     responses:
 *       200:
 *         description: The reminder object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Reminder not found.
 */
router.get('/:id', authGuard, getReminderById)

/**
 * @openapi
 * /reminders:
 *   post:
 *     tags: [Reminders]
 *     summary: Create a new reminder
 *     description: Creates a new reminder for the authenticated user. Does not associate with a pet.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReminderBody'
 *     responses:
 *       201:
 *         description: Reminder created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reminder'
 *       400:
 *         description: Bad Request - Validation error.
 *       401:
 *         description: Unauthorized.
 */
router.post('/', authGuard, createReminder)

/**
 * @openapi
 * /reminders/batch:
 *   post:
 *     tags: [Reminders]
 *     summary: Create multiple reminders at once
 *     description: Creates multiple reminders in a single request. Returns created reminders and any errors encountered.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/CreateReminderBody'
 *     responses:
 *       201:
 *         description: Batch reminders created. May contain partial success.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reminder'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index:
 *                             type: integer
 *                           reminderName:
 *                             type: string
 *                           error:
 *                             type: string
 *       400:
 *         description: Bad Request - Invalid payload or empty array.
 *       401:
 *         description: Unauthorized.
 */
router.post('/batch', authGuard, createMultipleReminders)

/**
 *   patch:
 *     tags: [Reminders]
 *     summary: Update a reminder
 *     description: Updates a reminder's details.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReminderBody'
 *     responses:
 *       200:
 *         description: Reminder updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reminder'
 *       400:
 *         description: Bad Request - Validation error.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Reminder not found.
 */
router.patch('/:id', authGuard, updateReminder)

/**
 * @openapi
 * /reminders/{id}:
 *   delete:
 *     tags: [Reminders]
 *     summary: Delete a reminder by its ID
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
 *     responses:
 *       200:
 *         description: Reminder deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Reminder not found.
 */
router.delete('/:id', authGuard, deleteReminder)

/**
 * @openapi
 * /reminders/{id}/status:
 *   patch:
 *     tags: [Reminders]
 *     summary: Toggle the status of a reminder
 *     description: Toggles the status of a reminder (e.g., from 'to_do' to 'done').
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
 *     responses:
 *       200:
 *         description: Reminder status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Reminder not found.
 */
router.patch('/:id/status', authGuard, toggleReminderStatus)

// ── Reminder Attachments ────────────────────────────────────────────────────

/**
 * @openapi
 * /reminders/{id}/attachments/request-url:
 *   post:
 *     tags: [Reminders]
 *     summary: Request a presigned PUT URL to upload an attachment
 *     description: Returns a presigned URL for direct upload to storage. Max 2 attachments per reminder.
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/attachments/request-url', authGuard, requestAttachmentUrl)

/**
 * @openapi
 * /reminders/{id}/attachments:
 *   post:
 *     tags: [Reminders]
 *     summary: Save attachment metadata after successful upload
 */
router.post('/:id/attachments', authGuard, saveAttachment)

/**
 * @openapi
 * /reminders/{id}/attachments/{attachmentId}:
 *   delete:
 *     tags: [Reminders]
 *     summary: Delete a specific attachment
 */
router.delete('/:id/attachments/:attachmentId', authGuard, deleteAttachment)

export default router
