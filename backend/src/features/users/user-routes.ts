import { Router } from 'express';
import { registerPushToken } from './user-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { registerPushTokenSchema } from './user-schema';

const userRoutes = Router();

/**
 * @openapi
 * /users/me/push-token:
 *   post:
 *     tags: [Users]
 *     summary: Register a push notification token for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushTokenBody'
 *     responses:
 *       200:
 *         description: Successfully registered push token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: 'string'
 *                   example: 'Push token registered successfully'
 *       400:
 *         description: Bad Request - Validation error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoutes.post('/me/push-token', authGuard, validate(registerPushTokenSchema), registerPushToken);

export default userRoutes;
