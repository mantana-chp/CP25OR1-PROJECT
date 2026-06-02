import { Router } from 'express';
import { getHealthRecordsController, getHealthRecordByIdController } from './health-record-controller';
import { authGuard } from '../../middlewares/authGuard';

const healthRecordRoutes = Router();

/**
 * @openapi
 * /health-records:
 *   get:
 *     tags: [Health Records]
 *     summary: Get all health records for the authenticated user
 *     description: Retrieves a list of reminders that are flagged as health records (`is_health: true`). Each health record includes attachments.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: An array of health record reminders with attachments.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Reminder'
 *                   - type: object
 *                     properties:
 *                       attachments:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Attachment'
 *       401:
 *         description: Unauthorized.
 */
healthRecordRoutes.get('/', authGuard, getHealthRecordsController);

/**
 * @openapi
 * /health-records/{id}:
 *   get:
 *     tags: [Health Records]
 *     summary: Get a specific health record by ID
 *     description: Retrieves a single health record reminder by ID with attachments.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         description: Health record ID (reminder ID)
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: A health record reminder with attachments.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Reminder'
 *                 - type: object
 *                   properties:
 *                     attachments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Attachment'
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden - no access to this health record.
 *       404:
 *         description: Health record not found.
 */
healthRecordRoutes.get('/:id', authGuard, getHealthRecordByIdController);

export default healthRecordRoutes;
