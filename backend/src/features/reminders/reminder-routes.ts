import { Router } from 'express';
import {
  getReminders,
  createReminder,
  getReminderById,
  deleteReminder,
  toggleReminderStatus,
} from './reminder-controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

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
router.get('/', authGuard, getReminders);

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
router.get('/:id', authGuard, getReminderById);

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
router.post('/', authGuard, createReminder);

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
router.delete('/:id', authGuard, deleteReminder);

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
router.patch('/:id/status', authGuard, toggleReminderStatus);

export default router;