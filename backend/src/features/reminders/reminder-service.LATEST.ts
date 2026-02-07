import * as reminderRepository from './reminder-repository';
import { ReminderWithPetName } from './reminder-types';
import { mapPrismaReminderWithPetToReminder } from './reminder-mapper';
import { NotFoundError, ApiError, BadRequestError, ConflictError } from '../../shared/errors';
import { reminder_status, category_name, reminders, Prisma, recurrence, RecurrenceFrequency } from '../../generated/prisma/client';
import prisma from '../../libs/db';
import { CreateReminderPayload, UpdateReminderPayload } from './reminder-schema';


const calculateNextOccurrence = (lastDate: Date, rule: recurrence): Date | null => {
  const nextDate = new Date(lastDate.getTime());
  nextDate.setUTCHours(0, 0, 0, 0);

  switch (rule.frequency) {
    case RecurrenceFrequency.DAILY:
      nextDate.setUTCDate(lastDate.getUTCDate() + rule.interval);
      break;

    case RecurrenceFrequency.WEEKLY:
      if (rule.daysOfWeek) {
        // Start checking from the day after the last occurrence
        for (let i = 1; i <= 30; i++) {
          const checkDate = new Date(lastDate.getTime());
          checkDate.setUTCDate(lastDate.getUTCDate() + i);
          const dayBit = 1 << checkDate.getUTCDay();

          if ((rule.daysOfWeek & dayBit) > 0) {
            // Simple interval logic for now, more complex logic might be needed for multi-week intervals with specific days
            if ((i-1) % (7 * rule.interval) === 0 || rule.interval === 1) {
               return checkDate;
            }
          }
        }
      }
      // Fallback for simple weekly interval without specific days
      nextDate.setUTCDate(lastDate.getUTCDate() + 7 * rule.interval);
      break;

    case RecurrenceFrequency.MONTHLY:
      const newMonthDate = new Date(lastDate);
      // Go to the next month
      newMonthDate.setUTCMonth(lastDate.getUTCMonth() + rule.interval);
      // If the day of the month has changed (e.g., from 31 to 1 because the next month is shorter)
      // set the date to the last day of the *previous* month (which is the intended month)
      if (newMonthDate.getUTCDate() < lastDate.getUTCDate()) {
        newMonthDate.setUTCDate(0);
      }
      return newMonthDate;

    case RecurrenceFrequency.YEARLY:
      nextDate.setUTCFullYear(lastDate.getUTCFullYear() + rule.interval);
      break;
      
    default:
      return null;
  }
  return nextDate;
};

const generateNextInstance = async (tx: Prisma.TransactionClient, currentReminder: reminders & { recurrence: recurrence | null; recurring_template: (reminders & { recurrence: recurrence | null }) | null }) => {
  const template = currentReminder.recurring_template ?? currentReminder;
  const rule = template.recurrence;

  if (!rule) return; // Series has been cancelled or was never recurring.

  // --- FIX: Check if any future instances already exist ---
  const futureInstanceExists = await tx.reminders.findFirst({
    where: {
      recurring_template_id: template.id,
      reminder_date: { gt: currentReminder.reminder_date },
    },
  });
  // If a future instance already exists, the chain is not broken. Do nothing.
  if (futureInstanceExists) {
    return;
  }
  
  const nextDate = calculateNextOccurrence(currentReminder.reminder_date, rule);
  if (!nextDate) return;

  if (rule.endDate && nextDate > rule.endDate) {
    return;
  }

  if (rule.endAfterOccurrences) {
    const templateId = template.id;
    const instanceCount = await tx.reminders.count({
      where: {
        OR: [{ id: templateId }, { recurring_template_id: templateId }],
      },
    });
    if (instanceCount >= rule.endAfterOccurrences) {
      return;
    }
  }

  // Final check for exact duplicates, just in case.
  const exactDuplicateExists = await tx.reminders.findFirst({
    where: { recurring_template_id: template.id, reminder_date: nextDate },
  });
  if (exactDuplicateExists) {
    return;
  }

  await tx.reminders.create({
    data: {
      user_id: template.user_id,
      pet_id: template.pet_id,
      reminder_name: template.reminder_name,
      description: template.description,
      category_name: template.category_name,
      reminder_date: nextDate,
      reminder_time: rule.reminder_time,
      reminder_status: reminder_status.to_do,
      recurring_template_id: template.id,
    },
  });
};

const isReminderOverdue = (reminder: reminders, now: Date): boolean => {
  if (!reminder.reminder_time) {
    const reminderDay = new Date(Date.UTC(reminder.reminder_date.getUTCFullYear(), reminder.reminder_date.getUTCMonth(), reminder.reminder_date.getUTCDate()));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return reminderDay < today;
  } else {
    const datePart = reminder.reminder_date.toISOString().split('T')[0];
    const timePart = reminder.reminder_time.toISOString().split('T')[1].split('.')[0];
    const isoStringWithOffset = `${datePart}T${timePart}+07:00`;
    const reminderDateTime = new Date(isoStringWithOffset);
    return reminderDateTime < now;
  }
};

export const getAllReminders = async (userId: string): Promise<ReminderWithPetName[]> => {
  const notDoneReminders = await reminderRepository.findNotDoneByUserId(userId);
  const doneReminders = await reminderRepository.findDoneByUserId(userId);
  return [...notDoneReminders, ...doneReminders];
};

export const getReminderById = async (id: string, userId: string): Promise<ReminderWithPetName> => {
  const reminder = await reminderRepository.findById(id);
  if (!reminder) throw new NotFoundError('Reminder not found');
  if (reminder.user_id !== userId) throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  return mapPrismaReminderWithPetToReminder(reminder);
};

export const deleteReminder = async (id: string, userId: string, deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES'): Promise<void> => {
  const reminder = await reminderRepository.findFullById(id);
  if (!reminder) throw new NotFoundError('Reminder not found');
  if (reminder.user_id !== userId) throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);

  const isRecurring = reminder.recurrence || reminder.recurring_template;
  const scope = deleteScope ?? 'THIS_INSTANCE_ONLY';

  //--- CANCEL A RECURRING SERIES ---
  if (isRecurring && scope === 'ALL_INSTANCES') {
    const template = reminder.recurring_template ?? reminder;
    
    await prisma.$transaction(async (tx) => {
      // 1. Delete the recurrence rule to stop the series. This is safe.
      await tx.recurrence.deleteMany({
        where: { reminder_id: template.id },
      });

      // 2. Manually delete any future, un-done instances. This is safe.
      await tx.reminders.deleteMany({
        where: {
          recurring_template_id: template.id,
          reminder_status: { in: ['to_do', 'overdue'] },
        },
      });

      // 3. If the reminder being acted upon is the template itself AND it's not done,
      // it should be deleted as it's now a cancelled, non-recurring, to-do item.
      if (reminder.id === template.id && reminder.reminder_status !== 'done') {
        await tx.reminders.delete({ where: { id: template.id } });
      }
    });
    return;
  }

  //--- DELETE A SINGLE INSTANCE (OR A NON-RECURRING REMINDER) ---
  if (reminder.reminder_status === 'done') {
    throw new BadRequestError('Reminders with status "Done" cannot be deleted.');
  }
  
  await prisma.$transaction(async (tx) => {
    if (isRecurring) {
      await generateNextInstance(tx, reminder);
    }
    await tx.notifications.deleteMany({ where: { reminder_id: id } });
    await tx.reminders.delete({ where: { id: id } });
  });
};

export const createNewReminder = async (newReminderData: CreateReminderPayload, userId: string): Promise<reminders> => {
  const { petId, children, recurrence, ...parentData } = newReminderData;
  const pet = await prisma.pets.findFirst({ where: { id: petId, user_id: userId } });
  if (!pet) throw new NotFoundError('Pet not found.');

  const reminderDate = new Date(parentData.reminderDate);
  const existingReminder = await prisma.reminders.findFirst({
    where: { pet_id: petId, reminder_name: parentData.reminderName, reminder_date: reminderDate },
  });
  if (existingReminder) throw new ConflictError('A reminder with this name and date already exists for this pet.');

  const reminderTime = parentData.reminderTime ? new Date(`1970-01-01T${parentData.reminderTime}Z`) : null;
  const tempReminder = { reminder_date: reminderDate, reminder_time: reminderTime } as reminders;
  const initialStatus = isReminderOverdue(tempReminder, new Date()) ? reminder_status.overdue : reminder_status.to_do;

  return await prisma.$transaction(async (tx) => {
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

    if (children && children.length > 0) {
      const childrenData = children.map(child => {
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
      await tx.reminders.createMany({ data: childrenData });
    }

    if (recurrence) {
      await tx.recurrence.create({
        data: {
          reminder_id: parentReminder.id,
          frequency: recurrence.frequency,
          interval: recurrence.interval,
          reminder_time: reminderTime,
          daysOfWeek: recurrence.daysOfWeek,
          dayOfMonth: recurrence.dayOfMonth,
          endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
          endAfterOccurrences: recurrence.endAfterOccurrences,
        },
      });
    }

    const fullReminder = await tx.reminders.findUnique({
      where: { id: parentReminder.id },
      include: { children: true, recurrence: true },
    });
    if (!fullReminder) throw new Error('Failed to retrieve created reminder.');
    return fullReminder;
  });
};

export const toggleReminderStatus = async (id: string, userId: string): Promise<ReminderWithPetName> => {
  const reminderToToggle = await reminderRepository.findFullById(id);
  if (!reminderToToggle) throw new NotFoundError('Reminder not found');
  if (reminderToToggle.user_id !== userId) throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);

  await prisma.$transaction(async (tx) => {
    let newStatus: reminder_status;
    let newStatusBeforeDone: reminder_status | null = reminderToToggle.status_before_done;
    let newStatusDoneAt: Date | null = reminderToToggle.status_done_at;
    let isHealthRecord = reminderToToggle.is_health;

    const healthCategories: category_name[] = [category_name.Vaccination, category_name.Checkup, category_name.Medication, category_name.Deworming];

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
        isHealthRecord = false;
        break;
      default:
        throw new Error('Invalid reminder status');
    }

    await tx.reminders.update({
      where: { id: id },
      data: { reminder_status: newStatus, status_before_done: newStatusBeforeDone, status_done_at: newStatusDoneAt, is_health: isHealthRecord },
    });

    if (newStatus === reminder_status.done) {
      await generateNextInstance(tx, reminderToToggle);
    }

    if (reminderToToggle.parent_id) {
      const parentId = reminderToToggle.parent_id;
      const siblings = await tx.reminders.findMany({ where: { parent_id: parentId } });
      const allChildrenDone = siblings.every(r => (r.id === id ? newStatus === 'done' : r.reminder_status === 'done'));
      const parent = await tx.reminders.findUnique({ where: { id: parentId } });
      if (parent) {
        if (allChildrenDone && parent.reminder_status !== 'done') {
          await tx.reminders.update({
            where: { id: parentId },
            data: { reminder_status: reminder_status.done, status_before_done: parent.reminder_status, status_done_at: new Date(), is_health: true },
          });
        } else if (!allChildrenDone && parent.reminder_status === 'done') {
          const newParentStatus = isReminderOverdue(parent, new Date()) ? 'overdue' : 'to_do';
          await tx.reminders.update({
            where: { id: parentId },
            data: { reminder_status: newParentStatus, status_before_done: null, status_done_at: null },
          });
        }
      }
    }
  });

  const updatedReminder = await reminderRepository.findFullById(id);
  if (!updatedReminder) throw new Error('Failed to retrieve reminder after update.');
  return mapPrismaReminderWithPetToReminder(updatedReminder);
};

export const updateReminder = async (
  reminderId: string,
  userId: string,
  updateData: UpdateReminderPayload
): Promise<ReminderWithPetName> => {
  const existingReminder = await reminderRepository.findById(reminderId);
  if (!existingReminder) throw new NotFoundError('Reminder not found');
  if (existingReminder.user_id !== userId) throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  if (existingReminder.reminder_status === reminder_status.done) throw new BadRequestError('Cannot edit a reminder that is marked as "done".');

  const newPetId = updateData.petId ?? existingReminder.pet_id;
  if (updateData.petId && updateData.petId !== existingReminder.pet_id) {
    const pet = await prisma.pets.findFirst({ where: { id: updateData.petId, user_id: userId } });
    if (!pet) throw new NotFoundError('The pet was not found for this user.');
  }

  const newReminderName = updateData.reminderName ?? existingReminder.reminder_name;
  const newReminderDate = updateData.reminderDate ? new Date(updateData.reminderDate) : existingReminder.reminder_date;

  if (updateData.reminderName || updateData.reminderDate) {
    const conflictingReminder = await prisma.reminders.findFirst({
      where: { id: { not: reminderId }, pet_id: newPetId, reminder_name: newReminderName, reminder_date: newReminderDate },
    });
    if (conflictingReminder) throw new ConflictError('A reminder with this name and date already exists for the selected pet.');
  }

  const reminderTime = updateData.reminderTime === null ? null : updateData.reminderTime ? new Date(`1970-01-01T${updateData.reminderTime}Z`) : existingReminder.reminder_time;
  const tempReminder = { reminder_date: newReminderDate, reminder_time: reminderTime } as reminders;
  const newStatus = isReminderOverdue(tempReminder, new Date()) ? reminder_status.overdue : reminder_status.to_do;

  const dataToUpdate: Prisma.remindersUpdateInput = { reminder_status: newStatus };

  if (updateData.petId) dataToUpdate.pets = { connect: { id: updateData.petId } };
  if (updateData.reminderName) dataToUpdate.reminder_name = updateData.reminderName;
  if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
  if (updateData.reminderDate) dataToUpdate.reminder_date = new Date(updateData.reminderDate);
  if (updateData.reminderTime !== undefined) dataToUpdate.reminder_time = reminderTime;
  if (updateData.categoryName !== undefined) {
    if (existingReminder.parent_id != null && existingReminder.category_name === category_name.Vaccination) {
      throw new ConflictError('Cannot change the category of a vaccination reminder.');
    }
    dataToUpdate.category_name = updateData.categoryName;
  }

  if (Object.keys(updateData).length === 0) throw new BadRequestError('Request body must contain at least one valid field to update.');

  await prisma.reminders.update({ where: { id: reminderId }, data: dataToUpdate });

  const updatedReminderWithPet = await reminderRepository.findById(reminderId);
  if (!updatedReminderWithPet) throw new Error('Failed to retrieve reminder after update.');
  return mapPrismaReminderWithPetToReminder(updatedReminderWithPet);
};

export const updateOverdueReminders = async (): Promise<void> => {
  const now = new Date();
  const remindersToCheck = await prisma.reminders.findMany({ where: { reminder_status: 'to_do', reminder_date: { lte: now } } });
  const remindersToUpdate = remindersToCheck.filter(r => isReminderOverdue(r, now));
  if (remindersToUpdate.length > 0) {
    const idsToUpdate = remindersToUpdate.map(r => r.id);
    await reminderRepository.updateStatusForIds(idsToUpdate, reminder_status.overdue);
    console.log(`Updated ${idsToUpdate.length} reminders to overdue.`);
  }
};
