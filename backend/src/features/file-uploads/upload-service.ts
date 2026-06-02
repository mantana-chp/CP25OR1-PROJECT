import { v4 as uuidv4 } from 'uuid';
import { minioClient } from '../../libs/minio-client';
import { UploadUrlRequest } from './upload-schema';
import { logger } from '../../libs/logger';
import { BadRequestError } from '../../shared/errors';

/**
 * File Upload Service
 * Handles presigned URL generation for secure direct uploads to MinIO
 */

export interface UploadUrlResponse {
    uploadUrl: string;
    objectKey: string;
    expiresIn: number;
}

/**
 * Generate object key with deterministic structure
 * Format: {category}/{userId}/{entityId}/{uuid}.{extension}
 */
export function generateObjectKey(
    category: 'pet-profile' | 'reminder-attachment' | 'medical-document',
    userId: string,
    entityId: string,
    fileName: string
): string {
    const extension = getFileExtension(fileName);
    const uniqueId = uuidv4();

    if (category === 'pet-profile') {
        return `pet-images/${userId}/${entityId}/${uniqueId}${extension}`;
    } else if (category === 'medical-document') {
        return `medical-documents/${userId}/${entityId}/${uniqueId}${extension}`;
    } else {
        return `attachments/${userId}/${entityId}/${uniqueId}${extension}`;
    }
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
    const match = fileName.match(/\.[^.]+$/);
    return match ? match[0] : '';
}

/**
 * Validate MIME type matches file extension
 */
export function validateMimeType(fileName: string, mimeType: string): boolean {
    const ext = getFileExtension(fileName).toLowerCase();

    const mimeTypeMap: Record<string, string[]> = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
        'application/pdf': ['.pdf'],
    };

    const validExtensions = mimeTypeMap[mimeType] || [];
    return validExtensions.includes(ext);
}

/**
 * Generate presigned PUT URL for file upload
 */
export async function generateUploadUrl(
    request: UploadUrlRequest,
    userId: string
): Promise<UploadUrlResponse> {
    // Validate MIME type matches extension
    if (!validateMimeType(request.fileName, request.fileType)) {
        throw new BadRequestError(
            `fileName and fileType are conflicting: "${request.fileName}" does not match MIME type "${request.fileType}"`
        );
    }

    // Generate object key
    const objectKey = generateObjectKey(
        request.category,
        userId,
        request.entityId,
        request.fileName
    );

    // Generate presigned PUT URL (5 minutes expiry)
    const expirySeconds = 300;
    const uploadUrl = await minioClient.generatePresignedPutUrl(
        objectKey,
        expirySeconds
    );

    logger.info(`Generated upload URL for user ${userId}: ${objectKey}`);

    return {
        uploadUrl,
        objectKey,
        expiresIn: expirySeconds,
    };
}

/**
 * Generate presigned GET URL for file download/view
 */
export async function generateDownloadUrl(
    objectKey: string,
    expirySeconds: number = 3600
): Promise<string> {
    // Verify object exists
    const exists = await minioClient.objectExists(objectKey);
    if (!exists) {
        throw new Error('File not found');
    }

    const downloadUrl = await minioClient.generatePresignedGetUrl(
        objectKey,
        expirySeconds
    );

    return downloadUrl;
}

/**
 * Delete file from MinIO
 */
export async function deleteFile(objectKey: string): Promise<void> {
    await minioClient.deleteObject(objectKey);
    logger.info(`Deleted file: ${objectKey}`);
}

/**
 * Verify file was uploaded successfully
 */
export async function verifyUpload(objectKey: string): Promise<boolean> {
    return await minioClient.objectExists(objectKey);
}
