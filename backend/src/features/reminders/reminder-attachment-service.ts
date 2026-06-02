import * as attachmentRepository from './reminder-attachment-repository';
import * as reminderRepository from './reminder-repository';
import { generateObjectKey } from '../file-uploads/upload-service';
import { minioClient } from '../../libs/minio-client';
import { NotFoundError, ApiError, BadRequestError } from '../../shared/errors';
import { reminder_attachments } from '../../generated/prisma/client';
import { logger } from '../../libs/logger';
import { canAccessPet } from '../pet-sharing/pet-sharing-repository';

const MAX_ATTACHMENTS = 2;
const PRESIGNED_GET_EXPIRY = 3600; // 1 hour

function assertReminderAttachmentObjectKey(
    objectKey: string,
    userId: string,
    reminderId: string,
): void {
    const expectedPrefix = `attachments/${userId}/${reminderId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
        throw new BadRequestError('Invalid object key for this reminder attachment.');
    }
}

export interface AttachmentDto {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    downloadUrl: string;
    createdAt: Date;
}

async function toDto(attachment: reminder_attachments): Promise<AttachmentDto> {
    const downloadUrl = await minioClient.generatePresignedGetUrl(
        attachment.object_key,
        PRESIGNED_GET_EXPIRY,
    );
    return {
        id: attachment.id,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        downloadUrl,
        createdAt: attachment.created_at,
    };
}

// ── Verify the user can access the reminder (owner OR active caregiver) ───────
async function assertOwner(reminderId: string, userId: string): Promise<void> {
    const reminder = await reminderRepository.findFullById(reminderId);
    if (!reminder) throw new NotFoundError('Reminder not found');
    const hasAccess = await canAccessPet(reminder.pet_id!, userId);
    if (!hasAccess)
        throw new ApiError('Forbidden', 403, [{ message: 'Access to this reminder denied' }]);
}

// ── Owners can mutate any reminder attachments; caregivers only their own ─────
async function assertCanMutateAttachments(reminderId: string, userId: string): Promise<void> {
    const reminder = await reminderRepository.findFullById(reminderId);
    if (!reminder) throw new NotFoundError('Reminder not found');

    const hasAccess = await canAccessPet(reminder.pet_id!, userId);
    if (!hasAccess) {
        throw new ApiError('Forbidden', 403, [{ message: 'Access to this reminder denied' }]);
    }

    const petOwnerId = reminder.pets?.user_id ?? reminder.user_id;
    const creatorId = reminder.created_by_user_id ?? reminder.user_id;
    const isPetOwner = petOwnerId === userId;

    if (!isPetOwner && creatorId !== userId) {
        throw new ApiError('Forbidden', 403, [
            { message: 'Caregivers can only modify attachments on reminders they created themselves', code: 403 },
        ]);
    }
}

// ── Request a presigned PUT URL (enforces ≤2 attachments) ────────────────────
export async function requestAttachmentUploadUrl(
    reminderId: string,
    userId: string,
    fileName: string,
    fileType: string,
): Promise<{ uploadUrl: string; objectKey: string; expiresIn: number }> {
    await assertCanMutateAttachments(reminderId, userId);

    const count = await attachmentRepository.countByReminderId(reminderId);
    if (count >= MAX_ATTACHMENTS) {
        throw new BadRequestError(
            `A reminder can have at most ${MAX_ATTACHMENTS} attachments.`,
        );
    }

    const objectKey = generateObjectKey('reminder-attachment', userId, reminderId, fileName);
    const expiresIn = 300; // 5 minutes
    const uploadUrl = await minioClient.generatePresignedPutUrl(objectKey, expiresIn);

    logger.info(`Generated attachment upload URL for reminder ${reminderId}: ${objectKey}`);
    return { uploadUrl, objectKey, expiresIn };
}

// ── Save attachment record after client uploads to MinIO ─────────────────────
export async function saveAttachment(
    reminderId: string,
    userId: string,
    payload: { objectKey: string; fileName: string; fileType: string; fileSize: number },
): Promise<AttachmentDto> {
    await assertCanMutateAttachments(reminderId, userId);

    assertReminderAttachmentObjectKey(payload.objectKey, userId, reminderId);

    // Ensure the file was actually uploaded before saving metadata.
    const objectExists = await minioClient.objectExists(payload.objectKey);
    if (!objectExists) {
        throw new BadRequestError('Uploaded file not found in storage. Please upload again.');
    }

    const count = await attachmentRepository.countByReminderId(reminderId);
    if (count >= MAX_ATTACHMENTS) {
        // Clean up the uploaded object since we can't store it
        await minioClient.deleteObject(payload.objectKey).catch(() => { });
        throw new BadRequestError(
            `A reminder can have at most ${MAX_ATTACHMENTS} attachments.`,
        );
    }

    const attachment = await attachmentRepository.create({
        reminder_id: reminderId,
        object_key: payload.objectKey,
        file_name: payload.fileName,
        file_type: payload.fileType,
        file_size: payload.fileSize,
    });

    return toDto(attachment);
}

// ── Delete a specific attachment ─────────────────────────────────────────────
export async function deleteAttachment(
    reminderId: string,
    attachmentId: string,
    userId: string,
): Promise<void> {
    await assertCanMutateAttachments(reminderId, userId);

    const existing = await attachmentRepository.findById(attachmentId);
    if (!existing) throw new NotFoundError('Attachment not found');
    if (existing.reminder_id !== reminderId)
        throw new ApiError('Forbidden', 403, [{ message: 'Attachment does not belong to this reminder' }]);

    await minioClient.deleteObject(existing.object_key).catch((err) => {
        logger.warn(`Could not delete attachment object ${existing.object_key}: ${err}`);
    });

    await attachmentRepository.deleteById(attachmentId);
}

// ── Get all attachments for a reminder (used internally by GET reminder by ID) ─
export async function getAttachmentDtos(reminderId: string): Promise<AttachmentDto[]> {
    const attachments = await attachmentRepository.findByReminderId(reminderId);
    return Promise.all(attachments.map(toDto));
}

// ── Bulk fetch attachments for many reminders at once (used in GET all reminders) ─
export async function getAttachmentDtosBulk(
    reminderIds: string[],
): Promise<Map<string, AttachmentDto[]>> {
    const result = new Map<string, AttachmentDto[]>();
    if (reminderIds.length === 0) return result;

    const attachments = await attachmentRepository.findByReminderIds(reminderIds);
    const dtos = await Promise.all(attachments.map(toDto));

    for (let i = 0; i < attachments.length; i++) {
        const reminderId = attachments[i].reminder_id;
        if (!result.has(reminderId)) result.set(reminderId, []);
        result.get(reminderId)!.push(dtos[i]);
    }
    return result;
}

// ── Bulk MinIO cleanup for a list of reminder IDs (used in deleteReminder) ───
export async function deleteAttachmentsForReminders(reminderIds: string[]): Promise<void> {
    if (reminderIds.length === 0) return;
    const attachments = await attachmentRepository.findByReminderIds(reminderIds);
    await Promise.allSettled(
        attachments.map((a) =>
            minioClient.deleteObject(a.object_key).catch((err) =>
                logger.warn(`Failed to delete MinIO object ${a.object_key}: ${err}`),
            ),
        ),
    );
    // DB rows are handled by Prisma cascade from reminders delete
}
