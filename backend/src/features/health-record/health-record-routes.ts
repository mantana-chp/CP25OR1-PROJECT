import { Router } from 'express';
import { getHealthRecordsController } from './health-record-controller';
import { authGuard } from '../../middlewares/authGuard';

const healthRecordRoutes = Router();

/**
 * @openapi
 * /health-records:
 *   get:
 *     tags: [Health Records]
 *     summary: Get all health records for the authenticated user
 *     description: Retrieves a list of reminders that are flagged as health records (`is_health: true`).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: An array of health record reminders.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reminder'
 *       401:
 *         description: Unauthorized.
 */
healthRecordRoutes.get('/', authGuard, getHealthRecordsController);

export default healthRecordRoutes;
