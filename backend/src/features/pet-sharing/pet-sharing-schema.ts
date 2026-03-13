import { z } from 'zod';

// POST /v1/pets/invite
export const generateInviteSchema = z.object({
    body: z.object({
        petIds: z.array(z.uuid('Invalid pet ID')).min(1, 'At least one pet is required'),
        alias: z.string().trim().min(1, 'Alias is required').max(100, 'Alias must be at most 100 characters'),
    }),
});

// POST /v1/pet-shares/claim/:token
export const claimInviteSchema = z.object({
    params: z.object({
        token: z.uuid('Invalid invite token'),
    }),
});

// GET /v1/pets/:petId/caregivers
export const listCaregiversSchema = z.object({
    params: z.object({
        petId: z.uuid('Invalid pet ID'),
    }),
});

// PATCH /v1/owner-contacts/:contactId
export const updateAliasSchema = z.object({
    params: z.object({
        contactId: z.uuid('Invalid contact ID'),
    }),
    body: z.object({
        alias: z.string().trim().min(1, 'Alias is required').max(100, 'Alias must be at most 100 characters'),
    }),
});

// DELETE /v1/pets/:petId/caregivers/:accessId
export const revokeCaregiverSchema = z.object({
    params: z.object({
        petId: z.uuid('Invalid pet ID'),
        accessId: z.uuid('Invalid access ID'),
    }),
});


