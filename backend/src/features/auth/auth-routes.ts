
import { Router } from 'express';
import AuthController from './auth-controller';
import { validate } from '../../middlewares/validate';
import { deviceLoginSchema, refreshSchema } from './auth-schema';
import { authGuard } from '../../middlewares/authGuard';

const authRoutes = Router();

/**
 * @openapi
 * /auth/device-login:
 *   post:
 *     tags: [Auth]
 *     summary: Login or Register a user based on device identifiers
 *     description: This endpoint handles both user sign-up and sign-in. If the installation ID is new, a user is created. If it's recognized, the existing user is logged in.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceLoginBody'
 *     responses:
 *       200:
 *         description: Successful login or registration.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad Request - Validation error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.post('/device-login', validate(deviceLoginSchema), AuthController.deviceLogin);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refreshes an access token
 *     security:
 *       - installationIdHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshBody'
 *     responses:
 *       200:
 *         description: Successfully refreshed tokens.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Unauthorized - Refresh token is invalid or expired.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.post('/refresh', validate(refreshSchema), AuthController.refresh);
// authRoutes.post('/logout', validate(logoutSchema), AuthController.logout); 

// For device transfer in other release
// authRoutes.post('/rebind', authGuard, validate(rebindSchema), AuthController.rebind);

export default authRoutes;
