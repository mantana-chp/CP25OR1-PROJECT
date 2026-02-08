import * as reminderRepository from './reminder-repository'
import { ReminderWithPetName, FullReminderDto } from './reminder-types'
import {
  mapPrismaReminderWithPetToReminder,
  mapFullPrismaReminderToFullReminderDto,
} from './reminder-mapper'
import {
  NotFoundError,
  ApiError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors'
import {
  reminder_status,
  category_name,
  reminders,
  Prisma,
  recurrence,
  RecurrenceFrequency,
} from '../../generated/prisma/client'
import prisma from '../../libs/db'
import { CreateReminderPayload, UpdateReminderPayload } from './reminder-schema'

const calculateNextOccurrence = (
  lastDate: Date,
  rule: recurrence,
): Date | null => {
  const nextDate = new Date(lastDate.getTime())
  nextDate.setUTCHours(0, 0, 0, 0)

  switch (rule.frequency) {
    case RecurrenceFrequency.DAILY:
      nextDate.setUTCDate(lastDate.getUTCDate() + rule.interval)
      break

    case RecurrenceFrequency.WEEKLY:
      if (rule.daysOfWeek) {
        // Start checking from the day after the last occurrence
        for (let i = 1; i <= 30; i++) {
          const checkDate = new Date(lastDate.getTime())
          checkDate.setUTCDate(lastDate.getUTCDate() + i)
          const dayBit = 1 << checkDate.getUTCDay()

          if ((rule.daysOfWeek & dayBit) > 0) {
            // This is a simplified interval check, for more complex scenarios a library would be better
            if (
              rule.interval === 1 ||
              (i > 1 &&
                Math.floor(
                  new Date(checkDate.getTime() - lastDate.getTime()).getTime() /
                    (1000 * 3600 * 24 * 7),
                ) %
                  rule.interval ===
                  0)
            ) {
              return checkDate
            }
          }
        }
      }
      // Fallback for simple weekly interval without specific days
      nextDate.setUTCDate(lastDate.getUTCDate() + 7 * rule.interval)
      break

    case RecurrenceFrequency.MONTHLY:
      const newMonthDate = new Date(lastDate)
      newMonthDate.setUTCMonth(
        lastDate.getUTCMonth() + rule.interval,
        lastDate.getUTCDate(),
      )
      if (newMonthDate.getUTCDate() < lastDate.getUTCDate()) {
        newMonthDate.setUTCDate(0)
      }
      return newMonthDate

    case RecurrenceFrequency.YEARLY:
      nextDate.setUTCFullYear(lastDate.getUTCFullYear() + rule.interval)
      break

    default:
      return null
  }
  return nextDate
}

const generateNextInstance = async (
  tx: Prisma.TransactionClient,
  currentReminder: reminders & {
    recurrence: recurrence | null
    recurring_template: (reminders & { recurrence: recurrence | null }) | null
  },
) => {
  const template = currentReminder.recurring_template ?? currentReminder
  const rule = template.recurrence

  if (!rule) return

  const futureInstanceExists = await tx.reminders.findFirst({
    where: {
      recurring_template_id: template.id,
      reminder_date: { gt: currentReminder.reminder_date },
    },
  })
  if (futureInstanceExists) return

  const nextDate = calculateNextOccurrence(currentReminder.reminder_date, rule)
  if (!nextDate) return

  if (rule.endDate && nextDate > rule.endDate) return

  if (rule.endAfterOccurrences) {
    const templateId = template.id
    const instanceCount = await tx.reminders.count({
      where: {
        OR: [{ id: templateId }, { recurring_template_id: templateId }],
      },
    })
    if (instanceCount >= rule.endAfterOccurrences) return
  }

  const exactDuplicateExists = await tx.reminders.findFirst({
    where: { recurring_template_id: template.id, reminder_date: nextDate },
  })
  if (exactDuplicateExists) return

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
  })
}

const isReminderOverdue = (reminder: reminders, now: Date): boolean => {
  if (!reminder.reminder_time) {
    const reminderDay = new Date(
      Date.UTC(
        reminder.reminder_date.getUTCFullYear(),
        reminder.reminder_date.getUTCMonth(),
        reminder.reminder_date.getUTCDate(),
      ),
    )
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    )
    return reminderDay < today
  } else {
    const datePart = reminder.reminder_date.toISOString().split('T')[0]
    const timePart = reminder.reminder_time
      .toISOString()
      .split('T')[1]
      .split('.')[0]
    const isoStringWithOffset = `${datePart}T${timePart}+07:00`
    const reminderDateTime = new Date(isoStringWithOffset)
    return reminderDateTime < now
  }
}

export const getAllReminders = async (
  userId: string,
): Promise<{ reminders: FullReminderDto[]; recurringRules: recurrence[] }> => {
  const notDonePrismaReminders =
    await reminderRepository.findNotDoneByUserIdWithRecurrence(userId)
  const donePrismaReminders =
    await reminderRepository.findDoneByUserIdWithRecurrence(userId)
  const recurringRules =
    await reminderRepository.findActiveRecurrenceRulesByUserId(userId)

  const notDoneReminders = notDonePrismaReminders.map(
    mapFullPrismaReminderToFullReminderDto,
  )
  const doneReminders = donePrismaReminders.map(
    mapFullPrismaReminderToFullReminderDto,
  )

  return {
    reminders: [...notDoneReminders, ...doneReminders],
    recurringRules,
  }
}

export const getReminderById = async (
  id: string,
  userId: string,
): Promise<FullReminderDto> => {
  const reminder = await reminderRepository.findFullById(id)
  if (!reminder) throw new NotFoundError('Reminder not found')
  if (reminder.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder', code: 403 },
    ])
  return mapFullPrismaReminderToFullReminderDto(reminder)
}

export const deleteReminder = async (
  id: string,
  userId: string,
  deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES',
): Promise<void> => {
  const reminder = await reminderRepository.findFullById(id)
  if (!reminder) throw new NotFoundError('Reminder not found')
  if (reminder.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder' },
    ])

  // UNIVERSAL RULE: A 'done' reminder is history and cannot be deleted, period.
  if (reminder.reminder_status === 'done') {
    throw new BadRequestError('Reminders with status "Done" cannot be deleted.')
  }

  const isRecurring = reminder.recurrence || reminder.recurring_template
  const scope = deleteScope ?? 'THIS_INSTANCE_ONLY'

  //--- CANCEL A RECURRING SERIES ---
  if (isRecurring && scope === 'ALL_INSTANCES') {
    const template = reminder.recurring_template ?? reminder

    await prisma.$transaction(async (tx) => {
      // 1. Delete the recurrence rule to stop the series.
      await tx.recurrence.deleteMany({
        where: { reminder_id: template.id },
      })

      // 2. Delete any other future, un-done instances.
      await tx.reminders.deleteMany({
        where: {
          recurring_template_id: template.id,
          reminder_status: { in: ['to_do', 'overdue'] },
        },
      })

      // 3. If the reminder being acted upon is itself a to_do instance (template or not), delete it.
      await tx.notifications.deleteMany({ where: { reminder_id: reminder.id } })
      await tx.reminders.delete({ where: { id: reminder.id } })
    })
    return
  }

  //--- DELETE A SINGLE INSTANCE (OR A NON-RECURRING REMINDER) ---
  await prisma.$transaction(async (tx) => {
    if (isRecurring) {
      await generateNextInstance(tx, reminder)
    }
    await tx.notifications.deleteMany({ where: { reminder_id: id } })
    await tx.reminders.delete({ where: { id: id } })
  })
}

export const createNewReminder = async (
  newReminderData: CreateReminderPayload,
  userId: string,
): Promise<reminders> => {
  const { petId, children, recurrence, ...parentData } = newReminderData
  const pet = await prisma.pets.findFirst({
    where: { id: petId, user_id: userId },
  })
  if (!pet) throw new NotFoundError('Pet not found.')

  const reminderDate = new Date(parentData.reminderDate)
  const existingReminder = await prisma.reminders.findFirst({
    where: {
      pet_id: petId,
      reminder_name: parentData.reminderName,
      reminder_date: reminderDate,
    },
  })
  if (existingReminder)
    throw new ConflictError(
      'A reminder with this name and date already exists for this pet.',
    )

  const reminderTime = parentData.reminderTime
    ? new Date(`1970-01-01T${parentData.reminderTime}Z`)
    : null
  const tempReminder = {
    reminder_date: reminderDate,
    reminder_time: reminderTime,
  } as reminders
  const initialStatus = isReminderOverdue(tempReminder, new Date())
    ? reminder_status.overdue
    : reminder_status.to_do

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
    })

    if (children && children.length > 0) {
      const childrenData = children.map((child) => {
        const childReminderDate = new Date(child.reminderDate)
        const childReminderTime = child.reminderTime
          ? new Date(`1970-01-01T${child.reminderTime}Z`)
          : null
        const childTempReminder = {
          reminder_date: childReminderDate,
          reminder_time: childReminderTime,
        } as reminders
        const childInitialStatus = isReminderOverdue(
          childTempReminder,
          new Date(),
        )
          ? reminder_status.overdue
          : reminder_status.to_do
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
        }
      })
      await tx.reminders.createMany({ data: childrenData })
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
          endDate: recurrence.endDate
            ? new Date(recurrence.endDate)
            : undefined,
          endAfterOccurrences: recurrence.endAfterOccurrences,
        },
      })
    }

    const fullReminder = await tx.reminders.findUnique({
      where: { id: parentReminder.id },
      include: { children: true, recurrence: true },
    })
    if (!fullReminder) throw new Error('Failed to retrieve created reminder.')
    return fullReminder
  })
}

export const toggleReminderStatus = async (
  id: string,
  userId: string,
): Promise<ReminderWithPetName> => {
  const reminderToToggle = await reminderRepository.findFullById(id)
  if (!reminderToToggle) throw new NotFoundError('Reminder not found')
  if (reminderToToggle.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder' },
    ])

  await prisma.$transaction(async (tx) => {
    let newStatus: reminder_status
    let newStatusBeforeDone: reminder_status | null =
      reminderToToggle.status_before_done
    let newStatusDoneAt: Date | null = reminderToToggle.status_done_at
    let isHealthRecord = reminderToToggle.is_health

    const healthCategories: category_name[] = [
      category_name.Vaccination,
      category_name.Checkup,
      category_name.Medication,
      category_name.Deworming,
    ]

    switch (reminderToToggle.reminder_status) {
      case 'to_do':
      case 'overdue':
        newStatus = reminder_status.done
        newStatusBeforeDone = reminderToToggle.reminder_status
        newStatusDoneAt = new Date()
        if (healthCategories.includes(reminderToToggle.category_name))
          isHealthRecord = true
        break
      case 'done':
        newStatus = isReminderOverdue(reminderToToggle, new Date())
          ? reminder_status.overdue
          : reminder_status.to_do
        newStatusBeforeDone = null
        newStatusDoneAt = null
        isHealthRecord = false
        break
      default:
        throw new Error('Invalid reminder status')
    }

    await tx.reminders.update({
      where: { id: id },
      data: {
        reminder_status: newStatus,
        status_before_done: newStatusBeforeDone,
        status_done_at: newStatusDoneAt,
        is_health: isHealthRecord,
      },
    })

    if (newStatus === reminder_status.done) {
      await generateNextInstance(tx, reminderToToggle)
    }

    if (reminderToToggle.parent_id) {
      const parentId = reminderToToggle.parent_id
      const siblings = await tx.reminders.findMany({
        where: { parent_id: parentId },
      })
      const allChildrenDone = siblings.every((r) =>
        r.id === id ? newStatus === 'done' : r.reminder_status === 'done',
      )
      const parent = await tx.reminders.findUnique({ where: { id: parentId } })
      if (parent) {
        if (allChildrenDone && parent.reminder_status !== 'done') {
          await tx.reminders.update({
            where: { id: parentId },
            data: {
              reminder_status: reminder_status.done,
              status_before_done: parent.reminder_status,
              status_done_at: new Date(),
              is_health: true,
            },
          })
        } else if (!allChildrenDone && parent.reminder_status === 'done') {
          const newParentStatus = isReminderOverdue(parent, new Date())
            ? 'overdue'
            : 'to_do'
          await tx.reminders.update({
            where: { id: parentId },
            data: {
              reminder_status: newParentStatus,
              status_before_done: null,
              status_done_at: null,
            },
          })
        }
      }
    }
  })

  const updatedReminder = await reminderRepository.findFullById(id)
  if (!updatedReminder)
    throw new Error('Failed to retrieve reminder after update.')
  return mapPrismaReminderWithPetToReminder(updatedReminder)
}

export const updateReminder = async (
  reminderId: string,
  userId: string,
  updateData: UpdateReminderPayload,
): Promise<ReminderWithPetName> => {
  const { editScope, recurrence, ...reminderUpdateData } = updateData

  const reminderToUpdate = await reminderRepository.findFullById(reminderId)
  if (!reminderToUpdate) throw new NotFoundError('Reminder not found')
  if (reminderToUpdate.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder' },
    ])

  const isChangingDateOrRecurrence =
    updateData.reminderDate || updateData.reminderTime || updateData.recurrence
  if (
    reminderToUpdate.reminder_status === 'done' &&
    isChangingDateOrRecurrence
  ) {
    throw new BadRequestError(
      'Cannot change date, time, or recurrence of a reminder that is marked as "done".',
    )
  }

  const isRecurring =
    reminderToUpdate.recurrence || reminderToUpdate.recurring_template

  //--- "SPLIT THE SERIES" LOGIC BY UPGRADING THE CURRENT INSTANCE ---
  if (isRecurring && editScope === 'THIS_AND_FUTURE_INSTANCES') {
    const originalTemplate =
      reminderToUpdate.recurring_template ?? reminderToUpdate
    const originalRule = originalTemplate.recurrence
    if (!originalRule)
      throw new BadRequestError(
        'Original series template or rule not found for update.',
      )

    const updatedResult = await prisma.$transaction(async (tx) => {
      // 1. Delete the old recurrence rule. The old template becomes a historical artifact.
      await tx.recurrence.delete({
        where: { id: originalRule.id },
      })

      // 2. Delete any other future instances belonging to the old series.
      await tx.reminders.deleteMany({
        where: {
          recurring_template_id: originalTemplate.id,
          reminder_date: { gt: reminderToUpdate.reminder_date },
        },
      })

      // 3. "Upgrade" the current instance to become the new template.
      const newReminderTime = reminderUpdateData.reminderTime
        ? new Date(`1970-01-01T${reminderUpdateData.reminderTime}Z`)
        : reminderToUpdate.reminder_time
      await tx.reminders.update({
        where: { id: reminderToUpdate.id },
        data: {
          recurring_template_id: null, // It is now its own template.
          reminder_name:
            reminderUpdateData.reminderName ?? reminderToUpdate.reminder_name,
          description:
            reminderUpdateData.description ?? reminderToUpdate.description,
          category_name:
            reminderUpdateData.categoryName ?? reminderToUpdate.category_name,
          reminder_time: newReminderTime,
          reminder_date: reminderUpdateData.reminderDate
            ? new Date(reminderUpdateData.reminderDate)
            : reminderToUpdate.reminder_date,
        },
      })

      // 4. Create a new recurrence rule and attach it to the newly upgraded instance.
      await tx.recurrence.create({
        data: {
          reminder_id: reminderToUpdate.id, // Attached to the upgraded instance
          frequency: recurrence?.frequency ?? originalRule.frequency,
          interval: recurrence?.interval ?? originalRule.interval,
          daysOfWeek: recurrence?.daysOfWeek ?? originalRule.daysOfWeek,
          reminder_time: newReminderTime,
          endDate: recurrence?.endDate
            ? new Date(recurrence.endDate)
            : originalRule.endDate,
          endAfterOccurrences:
            recurrence?.endAfterOccurrences ?? originalRule.endAfterOccurrences,
        },
      })

      // Return the ID of the reminder that was just upgraded.
      return reminderToUpdate
    })

    const finalUpdatedReminder = await reminderRepository.findFullById(
      updatedResult.id,
    )
    if (!finalUpdatedReminder)
      throw new Error('Failed to retrieve updated reminder.')
    return mapPrismaReminderWithPetToReminder(finalUpdatedReminder)
  }

  //--- LOGIC FOR EDITING A SINGLE INSTANCE (OR NON-RECURRING) ---
  const dataToUpdate: Prisma.remindersUpdateInput = {}
  const finalDate = reminderUpdateData.reminderDate
    ? new Date(reminderUpdateData.reminderDate)
    : reminderToUpdate.reminder_date
  const finalTime =
    reminderUpdateData.reminderTime === null
      ? null
      : reminderUpdateData.reminderTime
        ? new Date(`1970-01-01T${reminderUpdateData.reminderTime}Z`)
        : reminderToUpdate.reminder_time
  const tempForStatus = {
    reminder_date: finalDate,
    reminder_time: finalTime,
  } as reminders
  dataToUpdate.reminder_status = isReminderOverdue(tempForStatus, new Date())
    ? 'overdue'
    : 'to_do'

  if (reminderUpdateData.reminderName)
    dataToUpdate.reminder_name = reminderUpdateData.reminderName
  if (reminderUpdateData.description !== undefined)
    dataToUpdate.description = reminderUpdateData.description
  if (reminderUpdateData.categoryName)
    dataToUpdate.category_name = reminderUpdateData.categoryName
  if (reminderUpdateData.petId)
    dataToUpdate.pets = { connect: { id: reminderUpdateData.petId } }
  if (reminderUpdateData.reminderDate) dataToUpdate.reminder_date = finalDate
  if (reminderUpdateData.reminderTime !== undefined)
    dataToUpdate.reminder_time = finalTime

  if (Object.keys(reminderUpdateData).length === 0) {
    throw new BadRequestError(
      'Request body must contain at least one valid field to update.',
    )
  }

  // Use transaction to handle parent + child updates atomically
  await prisma.$transaction(async (tx) => {
    // Update parent reminder
    await tx.reminders.update({
      where: { id: reminderId },
      data: dataToUpdate,
    })

    // Handle children if provided
    if (updateData.children && updateData.children.length > 0) {
      for (const child of updateData.children) {
        const childReminderDate = new Date(child.reminderDate)
        const childReminderTime = child.reminderTime
          ? new Date(`1970-01-01T${child.reminderTime}Z`)
          : null

        // Determine child status based on date/time
        const childTempForStatus = {
          reminder_date: childReminderDate,
          reminder_time: childReminderTime,
        } as reminders
        const childStatus = isReminderOverdue(childTempForStatus, new Date())
          ? reminder_status.overdue
          : reminder_status.to_do

        if (child.id) {
          // Update existing child by ID
          await tx.reminders.update({
            where: { id: child.id },
            data: {
              reminder_name: child.reminderName,
              reminder_date: childReminderDate,
              reminder_time: childReminderTime,
              category_name: child.categoryName ?? category_name.Vaccination,
              reminder_status: childStatus,
            },
          })
        } else {
          // Create new child (no ID provided)
          await tx.reminders.create({
            data: {
              reminder_name: child.reminderName,
              reminder_date: childReminderDate,
              reminder_time: childReminderTime,
              category_name: child.categoryName ?? category_name.Vaccination,
              description: child.description,
              user_id: reminderToUpdate.user_id,
              pet_id: reminderUpdateData.petId ?? reminderToUpdate.pet_id,
              parent_id: reminderId,
            },
          })
        }
      }
    }

    // Delete children if specified
    if (updateData.childrenToDelete && updateData.childrenToDelete.length > 0) {
      await tx.reminders.deleteMany({
        where: {
          id: { in: updateData.childrenToDelete },
          parent_id: reminderId, 
        },
      })
    }
  })

  const updatedReminder = await reminderRepository.findFullById(reminderId)
  if (!updatedReminder)
    throw new Error('Failed to retrieve reminder after update.')
  return mapPrismaReminderWithPetToReminder(updatedReminder)
}

export const updateOverdueReminders = async (): Promise<void> => {
  const now = new Date()
  const remindersToCheck = await prisma.reminders.findMany({
    where: { reminder_status: 'to_do', reminder_date: { lte: now } },
  })
  const remindersToUpdate = remindersToCheck.filter((r) =>
    isReminderOverdue(r, now),
  )
  if (remindersToUpdate.length > 0) {
    const idsToUpdate = remindersToUpdate.map((r) => r.id)
    await reminderRepository.updateStatusForIds(
      idsToUpdate,
      reminder_status.overdue,
    )
    console.log(`Updated ${idsToUpdate.length} reminders to overdue.`)
  }
}
