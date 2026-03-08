import { z } from 'zod';

// --- Request URL (presigned PUT) ---
export const requestAttachmentUrlSchema = z.object({
    params: z.object({
        id: z.uuid(),
    }),
    body: z.object({
        fileName: z.string().min(1),
        fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
        fileSize: z.number().int().positive().max(10 * 1024 * 1024, {
            message: 'File size must not exceed 10 MB',
        }),
    }),
});

// --- Save attachment after successful PUT upload ---
export const saveAttachmentSchema = z.object({
    params: z.object({
        id: z.uuid(),
    }),
    body: z.object({
        objectKey: z.string().min(1),
        fileName: z.string().min(1),
        fileType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
        fileSize: z.number().int().positive().max(10 * 1024 * 1024, {
            message: 'File size must not exceed 10 MB',
        }),
    }),
});

// --- Delete an attachment ---
export const deleteAttachmentSchema = z.object({
    params: z.object({
        id: z.uuid(),
        attachmentId: z.uuid(),
    }),
});

export type RequestAttachmentUrlPayload = z.infer<typeof requestAttachmentUrlSchema>;
export type SaveAttachmentPayload = z.infer<typeof saveAttachmentSchema>['body'];
