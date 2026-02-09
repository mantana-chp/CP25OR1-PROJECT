import { Reminder, ReminderWithPetName, FullReminderDto, RecurrenceRule } from './reminder-types';
import { Prisma, reminders as PrismaReminder } from '../../generated/prisma/client';

// This payload type now includes children, but the children are base 'reminders'
type PrismaReminderWithPet = Prisma.remindersGetPayload<{
  include: {
    pets: true;
    children: true;
  };
}>;

type PrismaReminderWithPetAndRecurrence = Prisma.remindersGetPayload<{
  include: {
    pets: true;
    children: true;
    recurrence: true;
    recurring_template: {
      include: {
        recurrence: true;
      };
    };
  };
}>;

export const mapPrismaReminderToReminder = (prismaReminder: PrismaReminder): Reminder => {
  return {
    id: prismaReminder.id,
    userId: prismaReminder.user_id,
    petId: prismaReminder.pet_id,
    categoryName: prismaReminder.category_name,
    reminderName: prismaReminder.reminder_name ?? undefined,
    description: prismaReminder.description ?? undefined,
    reminderDate: prismaReminder.reminder_date,
    reminderTime: prismaReminder.reminder_time ? prismaReminder.reminder_time.toISOString().slice(11, 19) : undefined,
    reminderStatus: prismaReminder.reminder_status,
    statusDoneAt: prismaReminder.status_done_at ?? undefined,
    createdAt: prismaReminder.created_at,
    updatedAt: prismaReminder.updated_at,
  };
};

export const mapPrismaReminderWithPetToReminder = (prismaReminder: PrismaReminderWithPet): ReminderWithPetName => {
  if (!prismaReminder.pets) {
    // just for safety
    throw new Error(`Data integrity error: Reminder ${prismaReminder.id} is missing its associated pet.`);
  }

  const mappedParent = {
    ...mapPrismaReminderToReminder(prismaReminder),
    pet_name: prismaReminder.pets.pet_name,
  };

  if (prismaReminder.children && prismaReminder.children.length > 0) {
    // Map children using the simpler mapper, as they don't have pet data
    mappedParent.children = prismaReminder.children.map(mapPrismaReminderToReminder);
  }

  return mappedParent;
};

const mapPrismaRecurrenceToRecurrenceRule = (prismaRecurrence: Prisma.recurrenceGetPayload<{}>): RecurrenceRule => {
  return {
    id: prismaRecurrence.id,
    reminderId: prismaRecurrence.reminder_id,
    frequency: prismaRecurrence.frequency,
    interval: prismaRecurrence.interval,
    daysOfWeek: prismaRecurrence.daysOfWeek ?? undefined,
    dayOfMonth: prismaRecurrence.dayOfMonth ?? undefined,
    reminderTime: prismaRecurrence.reminder_time ? prismaRecurrence.reminder_time.toISOString().slice(11, 19) : undefined,
    endDate: prismaRecurrence.endDate ?? undefined,
    endAfterOccurrences: prismaRecurrence.endAfterOccurrences ?? undefined,
    createdAt: prismaRecurrence.created_at,
    updatedAt: prismaRecurrence.updated_at,
  };
};

export const mapFullPrismaReminderToFullReminderDto = (prismaReminder: PrismaReminderWithPetAndRecurrence): FullReminderDto => {
  if (!prismaReminder.pets) {
    throw new Error(`Data integrity error: Reminder ${prismaReminder.id} is missing its associated pet.`);
  }

  const baseReminder = mapPrismaReminderWithPetToReminder(prismaReminder as any);
  const dto: FullReminderDto = baseReminder;

  // Include recurrence data if available
  if (prismaReminder.recurrence) {
    dto.recurrence = mapPrismaRecurrenceToRecurrenceRule(prismaReminder.recurrence);
  } else if (prismaReminder.recurring_template?.recurrence) {
    dto.recurrence = mapPrismaRecurrenceToRecurrenceRule(prismaReminder.recurring_template.recurrence);
  }

  return dto;
};
