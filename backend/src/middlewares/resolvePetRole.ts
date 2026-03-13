import { Request, Response, NextFunction } from 'express';
import prisma from '../libs/db';
import { ForbiddenError } from '../shared/errors';
import { pet_status } from '../generated/prisma/client';

/**
 * Resolves req.petRole for protected pet routes.
 *
 * Expects:
 *  - req.user (set by authGuard before this middleware)
 *  - req.params.petId OR req.params.id (for routes using /me/:id pattern)
 *
 * Sets req.petRole to 'OWNER' | 'CAREGIVER', or throws 403.
 */
export const resolvePetRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;
        // Support both :petId (sharing routes) and :id (existing /me/:id routes)
        const petId = req.params.petId ?? req.params.id;

        if (!petId) {
            return next(new ForbiddenError('Pet ID is required.'));
        }

        // 1. Check ownership
        const pet = await prisma.pets.findFirst({
            where: {
                id: petId,
                deleted_at: null,
                status: { not: pet_status.DELETED },
            },
            select: { user_id: true },
        });

        if (!pet) {
            return next(new ForbiddenError('Pet not found or access denied.'));
        }

        if (pet.user_id === userId) {
            req.petRole = 'OWNER';
            return next();
        }

        // 2. Check active caregiver access
        const access = await prisma.pet_user_access.findFirst({
            where: {
                pet_id: petId,
                user_id: userId,
                revoked_at: null,
            },
        });

        if (access) {
            req.petRole = 'CAREGIVER';
            return next();
        }

        return next(new ForbiddenError('You do not have access to this pet.'));
    } catch (err) {
        next(err);
    }
};

/**
 * Middleware that allows OWNER only. Must be used after resolvePetRole.
 */
export const requireOwner = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (req.petRole !== 'OWNER') {
        return next(new ForbiddenError('Only the pet owner can perform this action.'));
    }
    next();
};
