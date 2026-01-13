import * as reminderRepository from './reminder-repository';
import { ReminderWithPetName } from './reminder-types';
import { mapPrismaReminderWithPetToReminder } from './reminder-mapper';
import { NotFoundError, ApiError, BadRequestError, ConflictError } from '../../shared/errors';
import { reminder_status, category_name, reminders } from '../../generated/prisma/client';
import prisma from '../../libs/db';
import { CreateReminderPayload } from './reminder-schema';

const isReminderOverdue = (reminder: reminders, now: Date): boolean => {
  if (!reminder.reminder_time) {
    // For date-only reminders, compare full days in UTC
    const reminderDay = new Date(
      Date.UTC(reminder.reminder_date.getUTCFullYear(), reminder.reminder_date.getUTCMonth(), reminder.reminder_date.getUTCDate())
    );
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return reminderDay < today; // Overdue if reminder day is strictly before today
  } else {
    // For reminders with time, construct a GMT+7 date and convert to UTC for robust comparison
    const datePart = reminder.reminder_date.toISOString().split('T')[0];
    const timePart = reminder.reminder_time.toISOString().split('T')[1].split('.')[0];
    const isoStringWithOffset = `${datePart}T${timePart}+07:00`; // Explicitly GMT+7
    const reminderDateTime = new Date(isoStringWithOffset);
    return reminderDateTime < now; // Overdue if reminder datetime is strictly in the past
  }
};

export const getAllReminders = async (userId: string): Promise<ReminderWithPetName[]> => {
  const notDoneReminders = await reminderRepository.findNotDoneByUserId(userId);
  const doneReminders = await reminderRepository.findDoneByUserId(userId);
  return [...notDoneReminders, ...doneReminders];
};

export const getReminderById = async (id: string, userId: string): Promise<ReminderWithPetName> => {
  const reminder = await reminderRepository.findById(id);

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  return mapPrismaReminderWithPetToReminder(reminder);
};

export const deleteReminder = async (id: string, userId: string): Promise<void> => {
  const reminder = await reminderRepository.findById(id);

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  if (reminder.reminder_status === reminder_status.done) {
    throw new BadRequestError('Reminders with status "Done" cannot be deleted.');
  }

  await prisma.$transaction(async (tx) => {
    // Delete all associated notifications first
    await tx.notifications.deleteMany({
      where: { reminder_id: id },
    });

    // Then delete the reminder itself
    await tx.reminders.delete({
      where: { id: id },
    });
  });
};

export const createNewReminder = async (newReminderData: CreateReminderPayload, userId: string): Promise<reminders> => {
  const { petId, children, ...parentData } = newReminderData;

  const pet = await prisma.pets.findFirst({
    where: { id: petId, user_id: userId },
  });

  if (!pet) {
    throw new NotFoundError('Pet not found.');
  }

  // 2. Check for conflicting reminders
  const reminderDate = new Date(parentData.reminderDate);
  const existingReminder = await prisma.reminders.findFirst({
    where: {
      pet_id: petId,
      reminder_name: parentData.reminderName,
      reminder_date: reminderDate,
    },
  });

  if (existingReminder) {
    throw new ConflictError('A reminder with this name and date already exists for this pet.');
  }

  // 3. Determine initial status
  const reminderTime = parentData.reminderTime ? new Date(`1970-01-01T${parentData.reminderTime}Z`) : null;
  const tempReminder = { reminder_date: reminderDate, reminder_time: reminderTime } as reminders;
  const initialStatus = isReminderOverdue(tempReminder, new Date()) ? reminder_status.overdue : reminder_status.to_do;

  // 4. Use a transaction to ensure all or nothing is created
  const result = await prisma.$transaction(async (tx) => {
    // Create the parent reminder
    const parentReminder = await tx.reminders.create({
      data: {
        reminder_name: parentData.reminderName,
        description: parentData.description,
        category_name: parentData.categoryName,
        reminder_date: reminderDate,
        reminder_time: reminderTime,
        reminder_status: initialStatus,
        user: { connect: { id: userId } },
        pets: { connect: { id: petId } },
      },
    });

    // If there are children, create them and link to the parent
    if (children && children.length > 0) {
      const childrenData = children.map((child) => {
        const childReminderDate = new Date(child.reminderDate);
        const childReminderTime = child.reminderTime ? new Date(`1970-01-01T${child.reminderTime}Z`) : null;
        const childTempReminder = { reminder_date: childReminderDate, reminder_time: childReminderTime } as reminders;
        const childInitialStatus = isReminderOverdue(childTempReminder, new Date()) ? reminder_status.overdue : reminder_status.to_do;

        return {
          reminder_name: child.reminderName,
          description: child.description,
          category_name: child.categoryName,
          reminder_date: childReminderDate,
          reminder_time: childReminderTime,
          reminder_status: childInitialStatus,
          user_id: userId,
          pet_id: petId,
          parent_id: parentReminder.id,
        };
      });

      await tx.reminders.createMany({
        data: childrenData,
      });
    }

    // 5. Return the created parent with its children
    const fullReminder = await tx.reminders.findUnique({
      where: { id: parentReminder.id },
      include: {
        children: true,
      },
    });

    if (!fullReminder) {
      throw new Error('Failed to retrieve created reminder.');
    }

    return fullReminder;
  });

  return result;
};


export const toggleReminderStatus = async (id: string, userId: string): Promise<ReminderWithPetName> => {
  const reminderToToggle = await reminderRepository.findById(id);

  if (!reminderToToggle) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminderToToggle.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  await prisma.$transaction(async (tx) => {
    let newStatus: reminder_status;
    let newStatusBeforeDone: reminder_status | null = reminderToToggle.status_before_done;
    let newStatusDoneAt: Date | null = reminderToToggle.status_done_at;
    let isHealthRecord = reminderToToggle.is_health; // Default to current state

    const healthCategories: category_name[] = [
      category_name.Vaccination,
      category_name.Checkup,
      category_name.Medication,
      category_name.Deworming,
    ];

    switch (reminderToToggle.reminder_status) {
      case 'to_do':
      case 'overdue':
        newStatus = reminder_status.done;
        newStatusBeforeDone = reminderToToggle.reminder_status;
        newStatusDoneAt = new Date();
        if (healthCategories.includes(reminderToToggle.category_name)) {
          isHealthRecord = true;
        }
        break;
      case 'done':
        newStatus = isReminderOverdue(reminderToToggle, new Date()) ? reminder_status.overdue : reminder_status.to_do;
        newStatusBeforeDone = null;
        newStatusDoneAt = null;
        isHealthRecord = false; // Revert health record status on undo
        break;
      default:
        throw new Error('Invalid reminder status');
    }

    // Update the toggled reminder
    await tx.reminders.update({
      where: { id: id },
      data: {
        reminder_status: newStatus,
        status_before_done: newStatusBeforeDone,
        status_done_at: newStatusDoneAt,
        is_health: isHealthRecord,
      },
    });

    // If the toggled reminder is a child, check and update its parent
    if (reminderToToggle.parent_id) {
      const parentId = reminderToToggle.parent_id;

      // Get all siblings
      const siblings = await tx.reminders.findMany({
        where: { parent_id: parentId },
      });

      const allChildrenDone = siblings.every((r) => r.reminder_status === reminder_status.done);

      const parent = await tx.reminders.findUnique({ where: { id: parentId } });
      if (parent) {
        if (allChildrenDone) {
          if (parent.reminder_status !== reminder_status.done) {
            await tx.reminders.update({
              where: { id: parentId },
              data: {
                reminder_status: reminder_status.done,
                status_before_done: parent.reminder_status,
                status_done_at: new Date(),
                is_health: true, // parent-child is always a health record
              },
            });
          }
        } else {
          if (parent.reminder_status === reminder_status.done) {
            const newParentStatus = isReminderOverdue(parent, new Date()) ? reminder_status.overdue : reminder_status.to_do;
            await tx.reminders.update({
              where: { id: parentId },
              data: {
                reminder_status: newParentStatus,
                status_before_done: null,
                status_done_at: null,
              },
            });
          }
        }
      }
    }
  });

  // Re-fetch the updated reminder to return the correct data structure
  const updatedReminder = await reminderRepository.findById(id);
  if (!updatedReminder) {
    // This should be unreachable if the initial find succeeded
    throw new Error('Failed to retrieve reminder after update.');
  }

  return mapPrismaReminderWithPetToReminder(updatedReminder);
};

export const updateOverdueReminders = async (): Promise<void> => {
  const now = new Date();

  const remindersToCheck = await prisma.reminders.findMany({
    where: {
      reminder_status: 'to_do',
      reminder_date: { lte: now },
    },
  });

  const remindersToUpdate = remindersToCheck.filter(r => isReminderOverdue(r, now));

  if (remindersToUpdate.length > 0) {
    const idsToUpdate = remindersToUpdate.map(r => r.id);
    await reminderRepository.updateStatusForIds(idsToUpdate, reminder_status.overdue);
    console.log(`Updated ${idsToUpdate.length} reminders to overdue.`);
  }
};