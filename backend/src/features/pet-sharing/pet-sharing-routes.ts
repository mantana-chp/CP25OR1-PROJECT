import { Router } from 'express'
import { authGuard } from '../../middlewares/authGuard'
import { validate } from '../../middlewares/validate'
import { resolvePetRole, requireOwner } from '../../middlewares/resolvePetRole'
import {
  generateInviteController,
  claimInviteController,
  previewInviteController,
  listCaregiversController,
  listAccessListController,
  updateAliasController,
  revokeCaregiverController,
  listInvitesController,
  cancelInviteController,
} from './pet-sharing-controller'
import {
  generateInviteSchema,
  claimInviteSchema,
  previewInviteSchema,
  updateAliasSchema,
  revokeCaregiverSchema,
  listInvitesSchema,
  cancelInviteSchema,
  listCaregiversSchema,
  listAccessListSchema,
} from './pet-sharing-schema'

// ─── Mounted under /pets ──────────────────────────────────────────────────────
// All routes here are relative to /v1/pets
export const petSharingPetRoutes = Router()

// POST /v1/pets/invite  (petIds in body — no :petId in URL)
petSharingPetRoutes.post(
  '/invite',
  authGuard,
  validate(generateInviteSchema),
  generateInviteController,
)

// GET /v1/pets/invites  (all pending invites created by the authenticated owner)
petSharingPetRoutes.get(
  '/invites',
  authGuard,
  validate(listInvitesSchema),
  listInvitesController,
)

// DELETE /v1/pets/invites/:inviteId
petSharingPetRoutes.delete(
  '/invites/:inviteId',
  authGuard,
  validate(cancelInviteSchema),
  cancelInviteController,
)

// GET /v1/pets/:petId/caregivers
petSharingPetRoutes.get(
  '/:petId/caregivers',
  authGuard,
  resolvePetRole,
  requireOwner,
  validate(listCaregiversSchema),
  listCaregiversController,
)

// GET /v1/pets/:petId/access-list
petSharingPetRoutes.get(
  '/:petId/access-list',
  authGuard,
  resolvePetRole,
  validate(listAccessListSchema),
  listAccessListController,
)

// DELETE /v1/pets/:petId/caregivers/:accessId
petSharingPetRoutes.delete(
  '/:petId/caregivers/:accessId',
  authGuard,
  resolvePetRole,
  requireOwner,
  validate(revokeCaregiverSchema),
  revokeCaregiverController,
)

// ─── Mounted under /pet-shares ────────────────────────────────────────────────
// GET /v1/pet-shares/preview/:token
// POST /v1/pet-shares/claim/:token
export const petSharesRoutes = Router()

petSharesRoutes.get(
  '/preview/:token',
  authGuard,
  validate(previewInviteSchema),
  previewInviteController,
)

petSharesRoutes.post(
  '/claim/:token',
  authGuard,
  validate(claimInviteSchema),
  claimInviteController,
)

// ─── Mounted under /owner-contacts ───────────────────────────────────────────
// PATCH /v1/owner-contacts/:contactId
export const ownerContactsRoutes = Router()

ownerContactsRoutes.patch(
  '/:contactId',
  authGuard,
  validate(updateAliasSchema),
  updateAliasController,
)
