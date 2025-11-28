import { Router } from 'express';
import { calculateScheduleController } from './vaccine-schedule-controller';
import { authGuard } from '../../middlewares/authGuard';

const vaccineScheduleRoutes = Router();

/**
 * @openapi
 * /vaccines/calculate:
 *   post:
 *     tags: [Vaccines]
 *     summary: Calculate a vaccine schedule for a pet
 *     description: Based on the pet's age and the vaccine rules, this endpoint calculates a series of future appointment dates.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VaccineCalculationBody'
 *     responses:
 *       200:
 *         description: An array of calculated vaccine appointments.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VaccineAppointment'
 *       400:
 *         description: Bad Request - Invalid input or pet/vaccine mismatch.
 *       401:
 *         description: Unauthorized.
 */
vaccineScheduleRoutes.post('/calculate', authGuard, calculateScheduleController);

export default vaccineScheduleRoutes;
