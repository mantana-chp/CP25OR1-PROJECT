import { Router } from 'express'
import {
  createPet,
  createMultiplePets,
  getAllPetProfilesController,
  getPetProfileByIdController,
  updatePetController,
  updatePetProfileImageController,
  deletePetProfileImageController,
  softDeletePetController,
  getPastPetsController,
  getRecentlyDeletedPetsController,
  permanentDeletePetController,
  restorePetController,
} from './pet-controller'
import { authGuard } from '../../middlewares/authGuard'
import { resolvePetRole, requireOwner } from '../../middlewares/resolvePetRole'
import { validate } from '../../middlewares/validate'
import {
  createPetSchema,
  createMultiplePetsSchema,
  getPetByIdSchema,
  updatePetSchema,
  updatePetProfileImageSchema,
  deletePetProfileImageSchema,
  softDeletePetSchema,
  permanentDeletePetSchema,
  restorePetSchema,
} from './pet-schema'

const petRoutes = Router()

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
petRoutes.post('/', authGuard, validate(createPetSchema), createPet)

/**
 * @openapi
 * /pets/bulk:
 *   post:
 *     tags: [Pets]
 *     summary: Create multiple pets at once for the authenticated user (limit 30 total)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pets
 *             properties:
 *               pets:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 30
 *                 items:
 *                   $ref: '#/components/schemas/CreatePetBody'
 *     responses:
 *       201:
 *         description: Pets created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PetProfile'
 *       400:
 *         description: Bad Request - Validation error.
 *       401:
 *         description: Unauthorized.
 *       409:
 *         description: Conflict - User has reached the pet limit.
 */
petRoutes.post(
  '/bulk',
  authGuard,
  validate(createMultiplePetsSchema),
  createMultiplePets,
)

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
petRoutes.get('/me', authGuard, getAllPetProfilesController)

/**
 * @openapi
 * /pets/me/past:
 *   get:
 *     tags: [Pets]
 *     summary: Get deceased pets for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: An array of deceased pets.
 *       401:
 *         description: Unauthorized.
 */
petRoutes.get('/me/past', authGuard, getPastPetsController)

/**
 * @openapi
 * /pets/me/recently-deleted:
 *   get:
 *     tags: [Pets]
 *     summary: Get recently deleted pets (within 30 days)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: An array of recently deleted pets.
 *       401:
 *         description: Unauthorized.
 */
petRoutes.get(
  '/me/recently-deleted',
  authGuard,
  getRecentlyDeletedPetsController,
)

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
petRoutes.get(
  '/me/:id',
  authGuard,
  resolvePetRole,
  validate(getPetByIdSchema),
  getPetProfileByIdController,
)

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
petRoutes.patch(
  '/me/:id',
  authGuard,
  resolvePetRole,
  requireOwner,
  validate(updatePetSchema),
  updatePetController,
)

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
  resolvePetRole,
  requireOwner,
  validate(updatePetProfileImageSchema),
  updatePetProfileImageController,
)

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
  resolvePetRole,
  requireOwner,
  validate(deletePetProfileImageSchema),
  deletePetProfileImageController,
)

/**
 * @openapi
 * /pets/me/{id}:
 *   delete:
 *     tags: [Pets]
 *     summary: Soft-delete a pet or mark as deceased
 *     description: |
 *       Delete a pet profile. Requires a reason:
 *       - JUST_DELETE: Soft-deletes the pet (blocked if last active pet)
 *       - DECEASED: Marks the pet as deceased (always allowed)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [JUST_DELETE, DECEASED]
 *               deceased_date:
 *                 type: string
 *                 format: date-time
 *                 description: Optional date of death (only used when reason is DECEASED)
 *     responses:
 *       200:
 *         description: Pet deleted or marked as deceased successfully.
 *       400:
 *         description: Bad Request - Cannot delete last active pet.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Pet not found.
 */
petRoutes.delete(
  '/me/:id',
  authGuard,
  resolvePetRole,
  requireOwner,
  validate(softDeletePetSchema),
  softDeletePetController,
)

/**
 * @openapi
 * /pets/me/{id}/permanent:
 *   delete:
 *     tags: [Pets]
 *     summary: Permanently delete a soft-deleted pet
 *     description: |
 *       Immediately and permanently removes a pet that was previously soft-deleted.
 *       Only pets with status DELETED can be permanently deleted.
 *       This action cannot be undone.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the soft-deleted pet
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pet permanently deleted.
 *       400:
 *         description: Bad Request - Pet is not in DELETED status.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Pet not found.
 */
petRoutes.delete(
  '/me/:id/permanent',
  authGuard,
  validate(permanentDeletePetSchema),
  permanentDeletePetController,
)

/**
 * @openapi
 * /pets/me/{id}/restore:
 *   patch:
 *     tags: [Pets]
 *     summary: Restore a soft-deleted pet back to active status
 *     description: |
 *       Restores a pet that was previously soft-deleted (status = DELETED) back to ACTIVE status.
 *       Only pets within the 30-day recovery window can be restored.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the soft-deleted pet to restore
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pet restored successfully.
 *       400:
 *         description: Bad Request - Pet is not in DELETED status.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Pet not found.
 */
petRoutes.patch(
  '/me/:id/restore',
  authGuard,
  validate(restorePetSchema),
  restorePetController,
)

export default petRoutes
