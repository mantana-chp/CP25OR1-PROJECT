import * as healthRecordRepository from './health-record-repository';
import { mapPrismaReminderWithPetToReminder } from '../reminders/reminder-mapper';
import { ReminderWithPetName } from '../reminders/reminder-types';
import { getAttachmentDtosBulk, getAttachmentDtos, AttachmentDto } from '../reminders/reminder-attachment-service';
import { canAccessPet } from '../pet-sharing/pet-sharing-repository';
import { NotFoundError, ApiError } from '../../shared/errors';

export const getHealthRecords = async (
  userId: string
): Promise<(ReminderWithPetName & { attachments: AttachmentDto[] })[]> => {
  const healthRecordsFromDb = await healthRecordRepository.findAllByAccessiblePets(userId);

  const mappedRecords = healthRecordsFromDb.map(mapPrismaReminderWithPetToReminder);

  // Bulk fetch attachments for all health records
  const recordIds = mappedRecords.map((record) => record.id);
  const attachmentsMap = await getAttachmentDtosBulk(recordIds);

  // Add attachments to each health record
  const recordsWithAttachments = mappedRecords.map((record) => ({
    ...record,
    attachments: attachmentsMap.get(record.id) ?? [],
  }));

  return recordsWithAttachments;
};

export const getHealthRecordById = async (
  id: string,
  userId: string
): Promise<ReminderWithPetName & { attachments: AttachmentDto[] }> => {
  // Find the reminder (health record) from the health_record repository
  const healthRecords = await healthRecordRepository.findAllByAccessiblePets(userId);
  const healthRecord = healthRecords.find((record) => record.id === id);

  if (!healthRecord) {
    throw new NotFoundError('Health record not found');
  }

  // Verify it's actually a health record (is_health: true)
  if (!healthRecord.is_health) {
    throw new NotFoundError('Health record not found');
  }

  // Verify access to the pet
  const hasAccess = await canAccessPet(healthRecord.pet_id, userId);
  if (!hasAccess) {
    throw new ApiError('Forbidden', 403, [
      { message: 'Access to this health record denied', code: 403 },
    ]);
  }

  // Map to DTO
  const mappedRecord = mapPrismaReminderWithPetToReminder(healthRecord);

  // Fetch attachments
  const attachments = await getAttachmentDtos(id);

  return { ...mappedRecord, attachments };
};
