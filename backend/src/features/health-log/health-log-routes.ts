import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard';
import { resolvePetRole } from '../../middlewares/resolvePetRole';
import {
  createHealthLog,
  getHealthLogs,
  getHealthLogById,
  updateHealthLog,
  deleteHealthLog,
  getWeightChart,
} from './health-log-controller';

const healthLogRoutes = Router();

/**
 * @openapi
 * /pets/{petId}/health-logs:
 *   post:
 *     tags: [Health Logs]
 *     summary: Create a new health log for a pet
 *     description: |
 *       Create a health log entry for a pet. Both owners and caregivers can create logs.
 *       If weight is provided, it will also update the pet's current weight.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: petId
 *         in: path
 *         required: true
 *         description: Pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Health log description (required)
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: "Pet seems more energetic today"
 *               weight:
 *                 type: number
 *                 description: Current weight (optional, will update pet's weight if provided)
 *                 example: 5.2
 *               note:
 *                 type: string
 *                 description: Additional notes (optional)
 *                 maxLength: 2000
 *                 example: "Ate well and played for 30 minutes"
 *     responses:
 *       201:
 *         description: Health log created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: success
 *                     description:
 *                       type: string
 *                       example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     log:
 *                       $ref: '#/components/schemas/HealthLog'
 *       400:
 *         description: Bad request or access denied
 *       401:
 *         description: Unauthorized
 */
healthLogRoutes.post('/:petId/health-logs', authGuard, resolvePetRole, createHealthLog);

/**
 * @openapi
 * /pets/{petId}/health-logs:
 *   get:
 *     tags: [Health Logs]
 *     summary: Get all health logs for a pet
 *     description: Retrieve paginated health logs for a pet. Both owners and caregivers can view logs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: petId
 *         in: path
 *         required: true
 *         description: Pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: limit
 *         in: query
 *         description: Number of logs to return (max 100)
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - name: offset
 *         in: query
 *         description: Number of logs to skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Health logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: success
 *                     description:
 *                       type: string
 *                       example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/HealthLog'
 *                     total:
 *                       type: integer
 *                       description: Total number of logs
 *                       example: 25
 *       400:
 *         description: Bad request or access denied
 *       401:
 *         description: Unauthorized
 */
healthLogRoutes.get('/:petId/health-logs', authGuard, resolvePetRole, getHealthLogs);

/**
 * @openapi
 * /pets/{petId}/health-logs/{logId}:
 *   get:
 *     tags: [Health Logs]
 *     summary: Get a specific health log
 *     description: Retrieve a single health log by ID. Both owners and caregivers can view logs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: petId
 *         in: path
 *         required: true
 *         description: Pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: logId
 *         in: path
 *         required: true
 *         description: Health log ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Health log retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: success
 *                     description:
 *                       type: string
 *                       example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     log:
 *                       $ref: '#/components/schemas/HealthLog'
 *       400:
 *         description: Bad request or access denied
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Health log not found
 */
// NOTE: weight-chart must be registered BEFORE /:logId to avoid Express
// treating the literal string "weight-chart" as a logId parameter.
healthLogRoutes.get('/:petId/health-logs/weight-chart', authGuard, resolvePetRole, getWeightChart);

healthLogRoutes.get('/:petId/health-logs/:logId', authGuard, resolvePetRole, getHealthLogById);

/**
 * @openapi
 * /pets/{petId}/health-logs/{logId}:
 *   patch:
 *     tags: [Health Logs]
 *     summary: Update a health log
 *     description: |
 *       Update a health log. Owners can edit any log, caregivers can only edit logs they created.
 *       If weight is provided, it will also update the pet's current weight.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: petId
 *         in: path
 *         required: true
 *         description: Pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: logId
 *         in: path
 *         required: true
 *         description: Health log ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 description: Health log description (optional)
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: "Updated: Pet is feeling much better"
 *               weight:
 *                 type: number
 *                 description: Current weight (optional, will update pet's weight if provided)
 *                 example: 5.5
 *               note:
 *                 type: string
 *                 nullable: true
 *                 description: Additional notes (optional, null to remove)
 *                 maxLength: 2000
 *                 example: "Added more playtime today"
 *     responses:
 *       200:
 *         description: Health log updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: success
 *                     description:
 *                       type: string
 *                       example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     log:
 *                       $ref: '#/components/schemas/HealthLog'
 *       400:
 *         description: Bad request or access denied
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - caregivers can only edit their own logs
 *       404:
 *         description: Health log not found
 */
healthLogRoutes.patch('/:petId/health-logs/:logId', authGuard, resolvePetRole, updateHealthLog);

/**
 * @openapi
 * /pets/{petId}/health-logs/{logId}:
 *   delete:
 *     tags: [Health Logs]
 *     summary: Delete a health log
 *     description: Delete a health log. Owners can delete any log, caregivers can only delete logs they created.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: petId
 *         in: path
 *         required: true
 *         description: Pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: logId
 *         in: path
 *         required: true
 *         description: Health log ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Health log deleted successfully
 *       400:
 *         description: Bad request or access denied
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - caregivers can only delete their own logs
 *       404:
 *         description: Health log not found
 */
healthLogRoutes.delete('/:petId/health-logs/:logId', authGuard, resolvePetRole, deleteHealthLog);

/**
 * @openapi
 * components:
 *   schemas:
 *     HealthLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Health log ID
 *         petId:
 *           type: string
 *           format: uuid
 *           description: Pet ID
 *         createdByUserId:
 *           type: string
 *           format: uuid
 *           description: User ID of the creator
 *         createdByName:
 *           type: string
 *           description: Installation ID of the creator
 *         description:
 *           type: string
 *           description: Health log description
 *         weight:
 *           type: number
 *           description: Weight recorded (optional)
 *           example: 5.2
 *         note:
 *           type: string
 *           description: Additional notes (optional)
 *         loggedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the log was created
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Record creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Record update timestamp
 */

export default healthLogRoutes;
