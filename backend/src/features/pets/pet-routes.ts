import { Router } from 'express';
import {
  createPet,
  getAllPetProfilesController,
  getPetProfileByIdController,
  updatePetController,
  updatePetProfileImageController,
  deletePetProfileImageController,
} from './pet-controller';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import {
  createPetSchema,
  getPetByIdSchema,
  updatePetSchema,
  updatePetProfileImageSchema,
  deletePetProfileImageSchema,
} from './pet-schema';

const petRoutes = Router();

/**
 * @openapi
 * /pets:
 *   post:
 *     tags: [Pets]
 *     summary: Create a new pet for the authenticated user (limit 10)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePetBody'
 *     responses:
 *       201:
 *         description: Pet created successfully.
 *       400:
 *         description: Bad Request - Validation error.
 *       401:
 *         description: Unauthorized.
 *       409:
 *         description: Conflict - User has reached the pet limit.
 */
petRoutes.post('/', authGuard, validate(createPetSchema), createPet);

/**
 * @openapi
 * /pets/me:
 *   get:
 *     tags: [Pets]
 *     summary: Get all pets for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: An array of the user's pets.
 *         content:
 *           application/json:
 *             schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/PetProfile'
 *       401:
 *         description: Unauthorized.
 */
petRoutes.get('/me', authGuard, getAllPetProfilesController);

/**
 * @openapi
 * /pets/me/{id}:
 *   get:
 *     tags: [Pets]
 *     summary: Get a specific pet by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the pet to retrieve.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The requested pet's profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PetProfile'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Pet not found.
 */
petRoutes.get('/me/:id', authGuard, validate(getPetByIdSchema), getPetProfileByIdController);

/**
 * @openapi
 * /pets/me/{id}:
 *   patch:
 *     tags: [Pets]
 *     summary: Update a specific pet's profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the pet to update.
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePetBody'
 *     responses:
 *       200:
 *         description: The updated pet's profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PetProfile'
 *       400:
 *         description: Bad Request - Validation error.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Pet not found.
 */
petRoutes.patch('/me/:id', authGuard, validate(updatePetSchema), updatePetController);

/**
 * @openapi
 * /pets/me/{id}/profile-image:
 *   put:
 *     tags: [Pets]
 *     summary: Update pet profile picture
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the pet
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
 *               - objectKey
 *             properties:
 *               objectKey:
 *                 type: string
 *                 description: MinIO object key from upload
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 */
petRoutes.put(
  '/me/:id/profile-image',
  authGuard,
  validate(updatePetProfileImageSchema),
  updatePetProfileImageController
);

/**
 * @openapi
 * /pets/me/{id}/profile-image:
 *   delete:
 *     tags: [Pets]
 *     summary: Delete pet profile picture
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the pet
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
 */
petRoutes.delete(
  '/me/:id/profile-image',
  authGuard,
  validate(deletePetProfileImageSchema),
  deletePetProfileImageController
);

export default petRoutes;
