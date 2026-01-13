import { notifications, reminders, pets, notification_status, reminder_status, category_name } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';

export interface PetDto {
  id: string;
  userId: string;
  speciesId: string;
  breedId?: string | null;
  petName: string;
  gender: 'male' | 'female' | 'unknown';
  birthDate?: Date | null;
  weight?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderDto {
  id: string;
  userId: string;
  petId: string;
  reminderName: string;
  description?: string | null;
  reminderDate: Date;
  reminderTime?: string | null;
  reminderStatus: reminder_status;
  statusDoneAt?: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  statusBeforeDone?: reminder_status | null;
  categoryName: category_name;
  isHealth: boolean;
  parentId?: string | null;
  pets?: PetDto;
  children?: ReminderDto[];
}

export interface NotificationDto {
  id: string;
  userId: string;
  reminderId?: string | null;
  sentAt?: Date | null;
  status: notification_status;
  readAt?: Date | null;
  createdAt: Date | null;
  reminder?: ReminderDto;
}

// Define a type that matches the payload from repository's findMany with includes
export type NotificationWithRelations = Prisma.notificationsGetPayload<{
    include: {
        reminders: {
            include: {
                pets: true;
            }
        },
        user: {
            include: {
                push_tokens: true;
            }
        }
    }
}>;

export const mapPrismaPetToDto = (prismaPet: pets): PetDto => ({
  id: prismaPet.id,
  userId: prismaPet.user_id,
  speciesId: prismaPet.species_id,
  breedId: prismaPet.breed_id,
  petName: prismaPet.pet_name,
  gender: prismaPet.gender,
  birthDate: prismaPet.birth_date,
  weight: prismaPet.weight ? prismaPet.weight.toNumber() : null,
  createdAt: prismaPet.created_at,
  updatedAt: prismaPet.updated_at,
});

export const mapPrismaReminderToDto = (prismaReminder: reminders & { pets?: pets | null }): ReminderDto => ({
  id: prismaReminder.id,
  userId: prismaReminder.user_id,
  petId: prismaReminder.pet_id,
  reminderName: prismaReminder.reminder_name,
  description: prismaReminder.description,
  reminderDate: prismaReminder.reminder_date,
  reminderTime: prismaReminder.reminder_time ? prismaReminder.reminder_time.toISOString().split('T')[1].split('.')[0] : null,
  reminderStatus: prismaReminder.reminder_status,
  statusDoneAt: prismaReminder.status_done_at,
  createdAt: prismaReminder.created_at,
  updatedAt: prismaReminder.updated_at,
  statusBeforeDone: prismaReminder.status_before_done,
  categoryName: prismaReminder.category_name,
  isHealth: prismaReminder.is_health,
  parentId: prismaReminder.parent_id,
  pets: prismaReminder.pets ? mapPrismaPetToDto(prismaReminder.pets) : undefined,
});


export const mapPrismaNotificationToDto = (prismaNotification: NotificationWithRelations): NotificationDto => ({
  id: prismaNotification.id,
  userId: prismaNotification.user.id, // Access user.id from the included user relation
  reminderId: prismaNotification.reminder_id,
  sentAt: prismaNotification.sent_at,
  status: prismaNotification.status,
  readAt: prismaNotification.read_at,
  createdAt: prismaNotification.created_at,
  reminder: prismaNotification.reminders ? mapPrismaReminderToDto(prismaNotification.reminders) : undefined,
});