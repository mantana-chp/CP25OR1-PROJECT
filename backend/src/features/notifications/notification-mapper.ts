import { notifications, reminders, pets, notification_status, reminder_status, category_name } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import { generateDownloadUrl } from '../file-uploads/upload-service';

export interface PetDto {
  id: string;
  userId: string;
  speciesId: string;
  breedId?: string | null;
  petName: string;
  gender: 'male' | 'female' | 'unknown';
  birthDate?: Date | null;
  weight?: number | null;
  profileImageUrl?: string | null;
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

export interface PetInfoDto {
  id: string;
  name: string;
  profileImageUrl?: string | null;
}

export interface PetTipsDto {
  title: string;
  desc: string;
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
  petInfo?: PetInfoDto;
  petTips?: PetTipsDto;
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
    },
    pet: true,
  }
}>;

export const mapPrismaPetToDto = async (prismaPet: pets): Promise<PetDto> => {
  let profileImageUrl: string | null = null;
  if (prismaPet.profile_image_key) {
    try {
      profileImageUrl = await generateDownloadUrl(prismaPet.profile_image_key, 3600);
    } catch {
      profileImageUrl = null;
    }
  }
  return {
    id: prismaPet.id,
    userId: prismaPet.user_id,
    speciesId: prismaPet.species_id,
    breedId: prismaPet.breed_id,
    petName: prismaPet.pet_name,
    gender: prismaPet.gender,
    birthDate: prismaPet.birth_date,
    weight: prismaPet.weight ? prismaPet.weight.toNumber() : null,
    profileImageUrl,
    createdAt: prismaPet.created_at,
    updatedAt: prismaPet.updated_at,
  };
};

export const mapPrismaReminderToDto = async (prismaReminder: reminders & { pets?: pets | null }): Promise<ReminderDto> => ({
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
  pets: prismaReminder.pets ? await mapPrismaPetToDto(prismaReminder.pets) : undefined,
});


export const mapPrismaNotificationToDto = async (prismaNotification: NotificationWithRelations): Promise<NotificationDto> => {
  const notificationDto: NotificationDto = {
    id: prismaNotification.id,
    userId: prismaNotification.user.id,
    reminderId: prismaNotification.reminder_id,
    sentAt: prismaNotification.sent_at,
    status: prismaNotification.status,
    readAt: prismaNotification.read_at,
    createdAt: prismaNotification.created_at,
    reminder: prismaNotification.reminders ? await mapPrismaReminderToDto(prismaNotification.reminders) : undefined,
  };

  // If the notification is a pet tip, add the petTips and petInfo fields
  if (prismaNotification.tips_title && prismaNotification.tips_desc) {
    notificationDto.petTips = {
      title: prismaNotification.tips_title,
      desc: prismaNotification.tips_desc,
    };
  }

  if (prismaNotification.pet) {
    let profileImageUrl: string | null = null;
    if (prismaNotification.pet.profile_image_key) {
      try {
        profileImageUrl = await generateDownloadUrl(prismaNotification.pet.profile_image_key, 3600);
      } catch {
        profileImageUrl = null;
      }
    }
    notificationDto.petInfo = {
      id: prismaNotification.pet.id,
      name: prismaNotification.pet.pet_name,
      profileImageUrl,
    };
  }

  return notificationDto;
};