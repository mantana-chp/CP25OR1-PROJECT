import { Router } from 'express';
import {
  calculateScheduleController,
  getVaccinesForPetController,
} from './vaccine-schedule-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { getVaccinesForPetSchema } from './vaccine-schedule-schema';

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

/**
 * @openapi
 * /vaccines/{petId}:
 *   get:
 *     tags: [Vaccines]
 *     summary: Get available vaccines for a specific pet
 *     description: Retrieves a list of all vaccine templates that are applicable to the specified pet's species.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the pet to get available vaccines for.
 *     responses:
 *       200:
 *         description: An array of available vaccine templates. Returns an empty array if none are found.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vaccine'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Pet not found.
 */
vaccineScheduleRoutes.get('/:petId', authGuard, validate(getVaccinesForPetSchema), getVaccinesForPetController);

export default vaccineScheduleRoutes;
