import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import * as service from './pet-sharing-service';
import {
    generateInviteSchema,
    claimInviteSchema,
    updateAliasSchema,
    revokeCaregiverSchema,
    cancelInviteSchema,
    listCaregiversSchema,
} from './pet-sharing-schema';

// POST /v1/pets/invite
export const generateInviteController = asyncHandler(
    async (req: Request, res: Response) => {
        const { body } = generateInviteSchema.parse(req);
        const { id: userId } = req.user!;
        const result = await service.generateInvite(body.petIds, userId, body.alias);
        sendSuccess(res, result, 201);
    },
);

// POST /v1/pet-shares/claim/:token
export const claimInviteController = asyncHandler(
    async (req: Request, res: Response) => {
        const { params } = claimInviteSchema.parse(req);
        const { id: userId } = req.user!;
        const installationId = req.headers['x-installation-id'] as string;
        const pet = await service.claimInvite(params.token, userId, installationId);
        sendSuccess(res, pet, 200);
    },
);

// GET /v1/pets/:petId/caregivers
export const listCaregiversController = asyncHandler(
    async (req: Request, res: Response) => {
        const { params } = listCaregiversSchema.parse(req);
        const result = await service.listCaregivers(params.petId);
        sendSuccess(res, result);
    },
);

// PATCH /v1/owner-contacts/:contactId
export const updateAliasController = asyncHandler(
    async (req: Request, res: Response) => {
        const { params, body } = updateAliasSchema.parse(req);
        const { id: userId } = req.user!;
        const result = await service.updateAlias(params.contactId, userId, body.alias);
        sendSuccess(res, result);
    },
);

// DELETE /v1/pets/:petId/caregivers/:accessId
export const revokeCaregiverController = asyncHandler(
    async (req: Request, res: Response) => {
        const { params } = revokeCaregiverSchema.parse(req);
        const { id: userId } = req.user!;
        const result = await service.revokeCaregiver(params.petId, params.accessId, userId);
        sendSuccess(res, result);
    },
);

// GET /v1/pets/invites
export const listInvitesController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id: userId } = req.user!;
        const result = await service.listPendingInvites(userId);
        sendSuccess(res, result);
    },
);

// DELETE /v1/pets/invites/:inviteId
export const cancelInviteController = asyncHandler(
    async (req: Request, res: Response) => {
        const { params } = cancelInviteSchema.parse(req);
        const { id: userId } = req.user!;
        const result = await service.cancelInvite(params.inviteId, userId);
        sendSuccess(res, result);
    },
);

// GET /v1/users/me/has-accessible-pets  (startup check)
export const hasAccessiblePetsController = asyncHandler(
    async (req: Request, res: Response) => {
        const { id: userId } = req.user!;
        const result = await service.hasAccessiblePets(userId);
        sendSuccess(res, { hasAccessiblePets: result });
    },
);
