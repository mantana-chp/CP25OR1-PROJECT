import { Request, Response } from 'express';
import * as attachmentService from './reminder-attachment-service';
import {
    requestAttachmentUrlSchema,
    saveAttachmentSchema,
    deleteAttachmentSchema,
} from './reminder-attachment-schema';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';

// POST /reminders/:id/attachments/request-url
export const requestAttachmentUrl = asyncHandler(async (req: Request, res: Response) => {
    const {
        params: { id: reminderId },
        body,
    } = requestAttachmentUrlSchema.parse(req);
    const { id: userId } = req.user!;

    const result = await attachmentService.requestAttachmentUploadUrl(
        reminderId,
        userId,
        body.fileName,
        body.fileType,
    );
    sendSuccess(res, result, 200);
});

// POST /reminders/:id/attachments
export const saveAttachment = asyncHandler(async (req: Request, res: Response) => {
    const {
        params: { id: reminderId },
        body,
    } = saveAttachmentSchema.parse(req);
    const { id: userId } = req.user!;

    const attachment = await attachmentService.saveAttachment(reminderId, userId, body);
    sendSuccess(res, attachment, 201);
});

// DELETE /reminders/:id/attachments/:attachmentId
export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
    const {
        params: { id: reminderId, attachmentId },
    } = deleteAttachmentSchema.parse(req);
    const { id: userId } = req.user!;

    await attachmentService.deleteAttachment(reminderId, attachmentId, userId);
    sendSuccess(res, undefined, 200);
});
