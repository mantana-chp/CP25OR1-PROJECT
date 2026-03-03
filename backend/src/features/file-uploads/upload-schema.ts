import { z } from 'zod';

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

// Maximum file size: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Request presigned URL schema
export const requestUploadUrlSchema = z.object({
    body: z.object({
        fileName: z.string().min(1, 'File name is required'),
        fileType: z.enum(ALLOWED_MIME_TYPES, {
            message: 'Invalid file type',
        }),
        fileSize: z
            .number()
            .positive('File size must be positive')
            .max(MAX_FILE_SIZE, 'File size exceeds 5MB limit'),
        category: z.enum(['pet-profile', 'reminder-attachment']),
        entityId: z.uuid('Invalid entity ID'), // petId or reminderId
    }),
});

export type UploadUrlRequest = z.infer<typeof requestUploadUrlSchema>['body'];

// Confirm upload schema
export const confirmUploadSchema = z.object({
    body: z.object({
        objectKey: z.string().min(1, 'Object key is required'),
        entityId: z.uuid('Invalid entity ID'),
        category: z.enum(['pet-profile', 'reminder-attachment']),
    }),
});

export type ConfirmUploadRequest = z.infer<typeof confirmUploadSchema>['body'];
