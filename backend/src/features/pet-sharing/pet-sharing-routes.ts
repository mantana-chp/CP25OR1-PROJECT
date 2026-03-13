import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { resolvePetRole, requireOwner } from '../../middlewares/resolvePetRole';
import {
    generateInviteController,
    claimInviteController,
    listCaregiversController,
    updateAliasController,
    revokeCaregiverController,
} from './pet-sharing-controller';
import {
    generateInviteSchema,
    claimInviteSchema,
    updateAliasSchema,
    revokeCaregiverSchema,
    listCaregiversSchema,
} from './pet-sharing-schema';

// ─── Mounted under /pets ──────────────────────────────────────────────────────
// All routes here are relative to /v1/pets
export const petSharingPetRoutes = Router();

// POST /v1/pets/invite  (petIds in body — no :petId in URL)
petSharingPetRoutes.post(
    '/invite',
    authGuard,
    validate(generateInviteSchema),
    generateInviteController,
);

// GET /v1/pets/:petId/caregivers
petSharingPetRoutes.get(
    '/:petId/caregivers',
    authGuard,
    resolvePetRole,
    requireOwner,
    validate(listCaregiversSchema),
    listCaregiversController,
);

// DELETE /v1/pets/:petId/caregivers/:accessId
petSharingPetRoutes.delete(
    '/:petId/caregivers/:accessId',
    authGuard,
    resolvePetRole,
    requireOwner,
    validate(revokeCaregiverSchema),
    revokeCaregiverController,
);

// ─── Mounted under /pet-shares ────────────────────────────────────────────────
// POST /v1/pet-shares/claim/:token
export const petSharesRoutes = Router();

petSharesRoutes.post(
    '/claim/:token',
    authGuard,
    validate(claimInviteSchema),
    claimInviteController,
);

// ─── Mounted under /owner-contacts ───────────────────────────────────────────
// PATCH /v1/owner-contacts/:contactId
export const ownerContactsRoutes = Router();

ownerContactsRoutes.patch(
    '/:contactId',
    authGuard,
    validate(updateAliasSchema),
    updateAliasController,
);
