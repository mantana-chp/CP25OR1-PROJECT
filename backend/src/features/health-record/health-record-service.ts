import * as healthRecordRepository from './health-record-repository';
import { mapPrismaReminderWithPetToReminder } from '../reminders/reminder-mapper';
import { ReminderWithPetName } from '../reminders/reminder-types';

export const getHealthRecords = async (userId: string): Promise<ReminderWithPetName[]> => {
  const healthRecordsFromDb = await healthRecordRepository.findAllByUserId(userId);

  return healthRecordsFromDb.map(mapPrismaReminderWithPetToReminder);
};
