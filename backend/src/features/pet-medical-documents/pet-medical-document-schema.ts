import { z } from 'zod';

const allowedFileTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
] as const;

const singleFileSchema = z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileType: z.enum(allowedFileTypes),
    fileSize: z.number().int().positive().max(10 * 1024 * 1024, {
        message: 'File size must not exceed 10 MB',
    }),
});

const singleSaveFileSchema = z.object({
    objectKey: z.string().min(1, 'Object key is required'),
    fileName: z.string().min(1, 'File name is required'),
    fileType: z.enum(allowedFileTypes),
    fileSize: z.number().int().positive().max(10 * 1024 * 1024, {
        message: 'File size must not exceed 10 MB',
    }),
});

export const petIdParamsSchema = z.object({
    petId: z.uuid('Invalid pet ID'),
});

export const documentIdParamsSchema = z.object({
    petId: z.uuid('Invalid pet ID'),
    documentId: z.uuid('Invalid document ID'),
});

export const requestMedicalDocumentUploadUrlsSchema = z.object({
    params: petIdParamsSchema,
    body: z.array(singleFileSchema)
        .min(1, 'At least one file is required')
        .max(5, 'A maximum of 5 files is allowed per upload request'),
});

export const saveMedicalDocumentsSchema = z.object({
    params: petIdParamsSchema,
    body: z.array(singleSaveFileSchema)
        .min(1, 'At least one file is required')
        .max(5, 'A maximum of 5 files is allowed per save request'),
});

export type RequestMedicalDocumentUploadUrlsPayload = z.infer<
    typeof requestMedicalDocumentUploadUrlsSchema
>['body'];

export type SaveMedicalDocumentsPayload = z.infer<
    typeof saveMedicalDocumentsSchema
>['body'];
