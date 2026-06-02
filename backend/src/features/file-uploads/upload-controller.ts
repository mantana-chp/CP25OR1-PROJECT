import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import {
    requestUploadUrlSchema,
    confirmUploadSchema,
} from './upload-schema';
import * as uploadService from './upload-service';
import { NotFoundError, ForbiddenError } from '../../shared/errors';
import prisma from '../../libs/db';
import { canAccessPet } from '../pet-sharing/pet-sharing-repository';

/**
 * Generate presigned URL for file upload
 * POST /api/uploads/request-url
 */
export const requestUploadUrl = asyncHandler(
    async (req: Request, res: Response) => {
        const { id: userId } = req.user!;
        const uploadRequest = requestUploadUrlSchema.parse(req).body;

        // For pet profile images, only the pet owner may obtain an upload URL
        if (uploadRequest.category === 'pet-profile') {
            const pet = await prisma.pets.findUnique({
                where: { id: uploadRequest.entityId },
                select: { user_id: true },
            });
            if (!pet) throw new NotFoundError('Pet not found');
            if (pet.user_id !== userId)
                throw new ForbiddenError('Only the pet owner can upload a profile image');
        }

        // For reminder attachments, the user must own or have caregiver access to the reminder's pet
        if (uploadRequest.category === 'reminder-attachment') {
            const reminder = await prisma.reminders.findUnique({
                where: { id: uploadRequest.entityId },
                select: { pet_id: true },
            });
            if (!reminder) throw new NotFoundError('Reminder not found');
            const hasAccess = reminder.pet_id
                ? await canAccessPet(reminder.pet_id, userId)
                : false;
            if (!hasAccess)
                throw new ForbiddenError('Access to this reminder denied');
        }

        const result = await uploadService.generateUploadUrl(uploadRequest, userId);

        sendSuccess(res, {
            uploadUrl: result.uploadUrl,
            objectKey: result.objectKey,
            expiresIn: result.expiresIn,
            instructions: {
                method: 'PUT',
                headers: {
                    'Content-Type': uploadRequest.fileType,
                },
                note: 'Upload the file directly to the uploadUrl using PUT request. After successful upload, call the confirm endpoint.',
            },
        });
    }
);

/**
 * Confirm file upload completion
 * POST /api/uploads/confirm
 */
export const confirmUpload = asyncHandler(
    async (req: Request, res: Response) => {
        const confirmRequest = confirmUploadSchema.parse(req).body;

        // Verify the file exists in MinIO
        const isUploaded = await uploadService.verifyUpload(
            confirmRequest.objectKey
        );

        if (!isUploaded) {
            throw new NotFoundError('File not found in storage');
        }

        sendSuccess(res, {
            success: true,
            message: 'Upload confirmed',
            objectKey: confirmRequest.objectKey,
        });
    }
);

/**
 * Get download URL for a file
 * GET /api/uploads/download?key=pet-images/userId/petId/uuid.jpg
 */
export const getDownloadUrl = asyncHandler(
    async (req: Request, res: Response) => {
        const objectKey = req.query.key as string;

        if (!objectKey) {
            return sendSuccess(res, { error: 'Missing "key" query parameter' }, 400);
        }

        const decodedKey = decodeURIComponent(objectKey);

        const downloadUrl = await uploadService.generateDownloadUrl(decodedKey);

        sendSuccess(res, {
            downloadUrl,
            expiresIn: 3600,
        });
    }
);
