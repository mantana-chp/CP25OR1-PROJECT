import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import {
    requestUploadUrlSchema,
    confirmUploadSchema,
} from './upload-schema';
import * as uploadService from './upload-service';
import { NotFoundError } from '../../shared/errors';

/**
 * Generate presigned URL for file upload
 * POST /api/uploads/request-url
 */
export const requestUploadUrl = asyncHandler(
    async (req: Request, res: Response) => {
        const { id: userId } = req.user!;
        const uploadRequest = requestUploadUrlSchema.parse(req).body;

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
