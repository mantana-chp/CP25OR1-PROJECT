import prisma from '../../libs/db';
import { invite_status, pet_status } from '../../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ─── Invite ──────────────────────────────────────────────────────────────────

export const expireStaleInvites = async () => {
    return prisma.pet_share_invites.updateMany({
        where: {
            status: invite_status.PENDING,
            expires_at: { lt: new Date() },
        },
        data: { status: invite_status.EXPIRED },
    });
};

export const createInvite = async (petIds: string[], createdBy: string, alias: string) => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
    return prisma.pet_share_invites.create({
        data: {
            id: uuidv4(),
            created_by: createdBy,
            caregiver_alias: alias,
            expires_at: expiresAt,
            status: invite_status.PENDING,
            invite_pets: {
                create: petIds.map((petId) => ({ pet_id: petId })),
            },
        },
        include: {
            invite_pets: { select: { pet_id: true } },
        },
    });
};

export const findInviteById = async (token: string) => {
    return prisma.pet_share_invites.findUnique({
        where: { id: token },
        include: {
            invite_pets: {
                include: { pet: { select: { id: true, user_id: true } } },
            },
        },
    });
};

export const markInviteAccepted = async (
    tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    inviteId: string,
    claimedBy: string,
) => {
    return tx.pet_share_invites.update({
        where: { id: inviteId },
        data: {
            status: invite_status.ACCEPTED,
            claimed_by: claimedBy,
            claimed_at: new Date(),
        },
    });
};

export const markInviteExpired = async (inviteId: string) => {
    return prisma.pet_share_invites.update({
        where: { id: inviteId },
        data: { status: invite_status.EXPIRED },
    });
};

export const findPendingInvitesByCreator = async (createdBy: string) => {
    return prisma.pet_share_invites.findMany({
        where: {
            created_by: createdBy,
            status: invite_status.PENDING,
            expires_at: { gt: new Date() },
        },
        include: {
            invite_pets: {
                include: { pet: { select: { id: true, pet_name: true } } },
            },
        },
        orderBy: { created_at: 'desc' },
    });
};

// ─── Contacts ────────────────────────────────────────────────────────────────

/**
 * Create the contact if it doesn't exist yet (ON CONFLICT DO NOTHING semantics).
 * If the row already exists, preserve the existing alias — do NOT overwrite.
 */
export const ensureContact = async (
    tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    ownerUserId: string,
    caregiverUserId: string,
    alias: string,
) => {
    // Try to create; skip silently if duplicate
    await tx.owner_caregiver_contacts.createMany({
        data: [
            {
                id: uuidv4(),
                owner_user_id: ownerUserId,
                caregiver_user_id: caregiverUserId,
                alias,
            },
        ],
        skipDuplicates: true,
    });

    // Return the row (whether just created or pre-existing)
    return tx.owner_caregiver_contacts.findUnique({
        where: {
            owner_user_id_caregiver_user_id: {
                owner_user_id: ownerUserId,
                caregiver_user_id: caregiverUserId,
            },
        },
    });
};

export const updateContactAlias = async (
    contactId: string,
    ownerUserId: string,
    alias: string,
) => {
    return prisma.owner_caregiver_contacts.update({
        where: { id: contactId, owner_user_id: ownerUserId },
        data: { alias, updated_at: new Date() },
    });
};

// ─── Pet User Access ──────────────────────────────────────────────────────────

export const findActiveAccess = async (petId: string, userId: string) => {
    return prisma.pet_user_access.findFirst({
        where: { pet_id: petId, user_id: userId, revoked_at: null },
    });
};

export const createAccess = async (
    tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    data: {
        petId: string;
        userId: string;
        contactId: string;
        grantedBy: string;
        inviteId: string;
        installationId: string;
    },
) => {
    // Upsert so that re-inviting a previously revoked caregiver restores access
    // instead of crashing on the @@unique([pet_id, user_id]) constraint.
    return tx.pet_user_access.upsert({
        where: {
            pet_id_user_id: {
                pet_id: data.petId,
                user_id: data.userId,
            },
        },
        update: {
            revoked_at: null,
            contact_id: data.contactId,
            granted_by: data.grantedBy,
            invite_id: data.inviteId,
            installation_id: data.installationId,
            granted_at: new Date(),
        },
        create: {
            id: uuidv4(),
            pet_id: data.petId,
            user_id: data.userId,
            role: 'CAREGIVER',
            contact_id: data.contactId,
            granted_by: data.grantedBy,
            invite_id: data.inviteId,
            installation_id: data.installationId,
        },
    });
};

export const findCaregiversByPetId = async (petId: string) => {
    return prisma.pet_user_access.findMany({
        where: { pet_id: petId, revoked_at: null },
        include: {
            contact: {
                select: { id: true, alias: true },
            },
        },
        orderBy: { granted_at: 'asc' },
    });
};

export const revokeAccess = async (accessId: string, petId: string) => {
    return prisma.pet_user_access.update({
        where: { id: accessId, pet_id: petId },
        data: { revoked_at: new Date() },
    });
};

// ─── Shared Pets (for getAllPetProfilesForUser) ───────────────────────────────

const petProfileSelect = {
    id: true,
    pet_name: true,
    gender: true,
    birth_date: true,
    weight: true,
    species_id: true,
    breed_id: true,
    profile_image_key: true,
    status: true,
    deceased_date: true,
    deleted_at: true,
    deletion_reason: true,
    species: { select: { name_th: true } },
    breeds: { select: { name_th: true } },
};

export const findSharedActivePetsByUserId = async (userId: string) => {
    const rows = await prisma.pet_user_access.findMany({
        where: {
            user_id: userId,
            revoked_at: null,
            pet: {
                status: pet_status.ACTIVE,
                deleted_at: null,
            },
        },
        include: { pet: { select: petProfileSelect } },
    });
    return rows.map((r) => r.pet);
};

export const hasAnyAccessiblePet = async (userId: string): Promise<boolean> => {
    const owned = await prisma.pets.count({
        where: { user_id: userId, status: pet_status.ACTIVE, deleted_at: null },
    });
    if (owned > 0) return true;

    const shared = await prisma.pet_user_access.count({
        where: {
            user_id: userId,
            revoked_at: null,
            pet: { status: pet_status.ACTIVE, deleted_at: null },
        },
    });
    return shared > 0;
};

/**
 * Returns true if the user owns the pet OR has active (non-revoked) caregiver access to it.
 * Used across service layers to gate both owner-only and shared operations.
 */
export const canAccessPet = async (petId: string, userId: string): Promise<boolean> => {
    const pet = await prisma.pets.findFirst({
        where: {
            id: petId,
            OR: [
                { user_id: userId },
                { user_access: { some: { user_id: userId, revoked_at: null } } },
            ],
        },
        select: { id: true },
    });
    return pet !== null;
};

/**
 * Returns DECEASED pets that have been shared with the user as a caregiver.
 * Used in getPastPets so caregivers can see deceased shared pets alongside their own.
 */
export const findSharedDeceasedPetsByUserId = async (userId: string) => {
    const rows = await prisma.pet_user_access.findMany({
        where: {
            user_id: userId,
            pet: { status: pet_status.DECEASED },
        },
        include: { pet: { select: petProfileSelect } },
    });
    return rows.map((r) => r.pet);
};
