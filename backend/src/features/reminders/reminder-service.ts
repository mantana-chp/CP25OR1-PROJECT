import * as reminderRepository from './reminder-repository'
import {
  deleteAttachmentsForReminders,
  getAttachmentDtos,
  getAttachmentDtosBulk,
  AttachmentDto,
} from './reminder-attachment-service'
import { ReminderWithPetName, FullReminderDto } from './reminder-types'
import {
  mapPrismaReminderWithPetToReminder,
  mapFullPrismaReminderToFullReminderDto
} from './reminder-mapper'
import {
  NotFoundError,
  ApiError,
  BadRequestError,
  ConflictError
} from '../../shared/errors'
import {
  reminder_status,
  category_name,
  reminders,
  Prisma,
  recurrence,
  RecurrenceFrequency,
  RecurrenceStatusEnum
} from '../../generated/prisma/client'
import prisma from '../../libs/db'
import { CreateReminderPayload, CreateMultipleRemindersPayload, UpdateReminderPayload } from './reminder-schema'

// Internal type used by createReminderInTransaction — always a single pet
type SinglePetReminderPayload = Omit<CreateReminderPayload, 'petId'> & { petId: string }

const healthCategories: category_name[] = [
  category_name.Vaccination,
  category_name.Checkup,
  category_name.Medication,
  category_name.Deworming
]

const calculateNextOccurrence = (
  templateStartDate: Date,
  currentDate: Date,
  rule: recurrence
): Date | null => {
  // Use template_start_date as the anchor point, and find next occurrence after currentDate
  const nextDate = new Date(templateStartDate.getTime())
  nextDate.setUTCHours(0, 0, 0, 0)

  switch (rule.frequency) {
    case RecurrenceFrequency.DAILY:
      // Find how many intervals have passed since template start
      const daysDiff = Math.floor(
        (currentDate.getTime() - templateStartDate.getTime()) /
        (1000 * 3600 * 24),
      )
      // Calculate intervals: (+1 to account for "next interval after current period")
      const intervalsToAdd =
        Math.ceil((daysDiff + 1) / rule.interval) * rule.interval
      nextDate.setUTCDate(templateStartDate.getUTCDate() + intervalsToAdd)
      break

    case RecurrenceFrequency.WEEKLY:
      if (rule.daysOfWeek) {
        // Start checking from currentDate onwards
        for (let i = 0; i <= 365; i++) {
          const checkDate = new Date(currentDate.getTime())
          checkDate.setUTCDate(currentDate.getUTCDate() + i)
          const dayBit = 1 << checkDate.getUTCDay()

          if ((rule.daysOfWeek & dayBit) > 0) {
            // Calculate weeks since template start
            const weeksSinceStart = Math.floor(
              (checkDate.getTime() - templateStartDate.getTime()) /
              (1000 * 3600 * 24 * 7),
            )
            if (rule.interval === 1 || weeksSinceStart % rule.interval === 0) {
              return checkDate
            }
          }
        }
      }
      // Fallback for simple weekly interval without specific days
      nextDate.setUTCDate(templateStartDate.getUTCDate() + 7 * rule.interval)
      break

    case RecurrenceFrequency.MONTHLY:
      const newMonthDate = new Date(templateStartDate)
      let monthsDiff =
        (currentDate.getUTCFullYear() - templateStartDate.getUTCFullYear()) *
        12 +
        (currentDate.getUTCMonth() - templateStartDate.getUTCMonth())

      // If we're in a later month but haven't reached the occurrence day yet,
      // we haven't actually completed the transition to that month's interval
      if (
        currentDate.getUTCDate() < templateStartDate.getUTCDate() &&
        monthsDiff > 0
      ) {
        monthsDiff--
      }

      // Calculate intervals: (+1 to account for "next interval after current period")
      const intervalsToAddMonth =
        Math.ceil((monthsDiff + 1) / rule.interval) * rule.interval
      newMonthDate.setUTCMonth(
        templateStartDate.getUTCMonth() + intervalsToAddMonth,
        templateStartDate.getUTCDate()
      )
      if (newMonthDate.getUTCDate() < templateStartDate.getUTCDate()) {
        newMonthDate.setUTCDate(0)
      }
      return newMonthDate

    case RecurrenceFrequency.YEARLY:
      let yearsDiff =
        currentDate.getUTCFullYear() - templateStartDate.getUTCFullYear()

      // If we're in a later year but haven't reached the occurrence date yet,
      // we haven't actually completed the transition to that year's interval
      if (
        yearsDiff > 0 &&
        (currentDate.getUTCMonth() < templateStartDate.getUTCMonth() ||
          (currentDate.getUTCMonth() === templateStartDate.getUTCMonth() &&
            currentDate.getUTCDate() < templateStartDate.getUTCDate()))
      ) {
        yearsDiff--
      }

      // Calculate intervals: (+1 to account for "next interval after current period")
      const intervalsToAddYear =
        Math.ceil((yearsDiff + 1) / rule.interval) * rule.interval
      nextDate.setUTCFullYear(
        templateStartDate.getUTCFullYear() + intervalsToAddYear,
      )
      break

    default:
      return null
  }
  return nextDate
}

const generateNextInstance = async (
  tx: Prisma.TransactionClient,
  currentReminder: reminders & {
    recurrence_template: recurrence | null
  }
) => {
  // Get the recurrence template linked to this reminder via recurrence_id
  const rule = currentReminder.recurrence_template

  if (!rule) return

  // Check if the pet is still active before generating next instance
  const pet = await tx.pets.findUnique({
    where: { id: currentReminder.pet_id },
    select: { status: true }
  })
  if (!pet || pet.status !== 'ACTIVE') return

  // Use template_start_date as the anchor for calculation
  const templateStartDate = new Date(rule.template_start_date)
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)

  // Check if a future instance already exists for this recurrence template
  const futureInstanceExists = await tx.reminders.findFirst({
    where: {
      recurrence_id: rule.id,
      reminder_date: { gt: currentReminder.reminder_date }
    }
  })
  if (futureInstanceExists) return

  const nextDate = calculateNextOccurrence(
    templateStartDate,
    currentReminder.reminder_date,
    rule as any,
  )
  if (!nextDate) return

  if (rule.endDate && nextDate > rule.endDate) return

  if (rule.endAfterOccurrences) {
    const instanceCount = await tx.reminders.count({
      where: {
        recurrence_id: rule.id
      }
    })
    if (instanceCount >= rule.endAfterOccurrences) return
  }

  const exactDuplicateExists = await tx.reminders.findFirst({
    where: { recurrence_id: rule.id, reminder_date: nextDate }
  })
  if (exactDuplicateExists) return

  // Determine if this instance is overdue (past date)
  const isOverdue = nextDate < now
  const instanceStatus = isOverdue
    ? reminder_status.overdue
    : reminder_status.to_do

  // Create new instance linked to the recurrence template
  await tx.reminders.create({
    data: {
      user_id: currentReminder.user_id,
      pet_id: currentReminder.pet_id,
      reminder_name: rule.reminder_name ?? currentReminder.reminder_name,
      description: rule.description ?? currentReminder.description,
      category_name: rule.category_name ?? currentReminder.category_name,
      reminder_date: nextDate,
      reminder_time: rule.reminder_time,
      reminder_status: instanceStatus, // Set to overdue if past date
      recurrence_id: rule.id // NEW: Link to recurrence template
    }
  })
}

const isReminderOverdue = (reminder: reminders, now: Date): boolean => {
  if (!reminder.reminder_time) {
    const reminderDay = new Date(
      Date.UTC(
        reminder.reminder_date.getUTCFullYear(),
        reminder.reminder_date.getUTCMonth(),
        reminder.reminder_date.getUTCDate()
      )
    )
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
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
  userId: string
): Promise<{ reminders: (FullReminderDto & { attachments: AttachmentDto[] })[]; recurringRules: recurrence[] }> => {
  const notDonePrismaReminders =
    await reminderRepository.findNotDoneByUserIdWithRecurrence(userId)
  const donePrismaReminders =
    await reminderRepository.findDoneByUserIdWithRecurrence(userId)
  const recurringRules =
    await reminderRepository.findActiveRecurrenceRulesByUserId(userId)

  const allDtos = [
    ...notDonePrismaReminders.map(mapFullPrismaReminderToFullReminderDto),
    ...donePrismaReminders.map(mapFullPrismaReminderToFullReminderDto),
  ]

  const reminderIds = allDtos.map((r) => r.id)
  const attachmentsMap = await getAttachmentDtosBulk(reminderIds)

  const reminders = allDtos.map((dto) => ({
    ...dto,
    attachments: attachmentsMap.get(dto.id) ?? [],
  }))

  return { reminders, recurringRules }
}

export const getReminderById = async (
  id: string,
  userId: string,
): Promise<FullReminderDto & { attachments: AttachmentDto[] }> => {
  const reminder = await reminderRepository.findFullById(id)
  if (!reminder) throw new NotFoundError('Reminder not found')
  if (reminder.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder', code: 403 }
    ])
  const dto = mapFullPrismaReminderToFullReminderDto(reminder)
  const attachments = await getAttachmentDtos(id)
  return { ...dto, attachments }
}

export const deleteReminder = async (
  id: string,
  userId: string,
  deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES'
): Promise<void> => {
  const reminder = await reminderRepository.findFullById(id)
  if (!reminder) throw new NotFoundError('Reminder not found')
  if (reminder.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder' }
    ])

  if (reminder.reminder_status === 'done') {
    throw new BadRequestError('Reminders with status "Done" cannot be deleted.')
  }

  const isRecurring =
    reminder.recurrence_id !== null && reminder.recurrence_id !== undefined
  const scope = deleteScope ?? 'THIS_INSTANCE_ONLY'

  //--- CANCEL A RECURRING SERIES (ALL_INSTANCES) ---
  if (isRecurring && scope === 'ALL_INSTANCES') {
    // Collect IDs of all reminders that will be deleted, for MinIO cleanup after transaction
    const futuresToDelete = await prisma.reminders.findMany({
      where: {
        recurrence_id: reminder.recurrence_id,
        id: { not: reminder.id },
        reminder_status: { in: ['to_do', 'overdue'] },
      },
      select: { id: true },
    })
    const allIdsToDelete = [reminder.id, ...futuresToDelete.map((r) => r.id)]

    await prisma.$transaction(async (tx) => {
      // 1. Mark the recurrence template as CANCELLED and set end date to today
      await tx.recurrence.update({
        where: { id: reminder.recurrence_id! },
        data: {
          recurrence_status: RecurrenceStatusEnum.CANCELLED,
          endDate: new Date() // Set end date to today
        }
      })

      // 2. Delete any future, un-done instances linked to this recurrence template (excluding current)
      await tx.reminders.deleteMany({
        where: {
          recurrence_id: reminder.recurrence_id,
          id: { not: reminder.id }, // Exclude the current reminder
          reminder_status: { in: ['to_do', 'overdue'] }
        }
      })

      // 3. Delete the reminder instance being acted upon
      await tx.notifications.deleteMany({ where: { reminder_id: reminder.id } })
      await tx.reminders.delete({ where: { id: reminder.id } })
    })

    // Best-effort MinIO cleanup after successful DB transaction
    await deleteAttachmentsForReminders(allIdsToDelete)
    return
  }

  //--- DELETE A SINGLE INSTANCE (THIS_INSTANCE_ONLY) ---
  await prisma.$transaction(async (tx) => {
    if (isRecurring) {
      // Generate the next instance for the recurrence series
      await generateNextInstance(tx, reminder)
    }
    await tx.notifications.deleteMany({ where: { reminder_id: id } })
    await tx.reminders.delete({ where: { id: id } })
  })

  // Best-effort MinIO cleanup after successful DB transaction
  await deleteAttachmentsForReminders([id])
}

const createReminderInTransaction = async (
  tx: Prisma.TransactionClient,
  newReminderData: SinglePetReminderPayload,
  userId: string,
): Promise<reminders> => {
  const { petId, children, recurrence, ...parentData } = newReminderData
  const pet = await tx.pets.findFirst({
    where: { id: petId, user_id: userId },
  })
  if (!pet) throw new NotFoundError('Pet not found.')

  const reminderDate = new Date(parentData.reminderDate)
  const existingReminder = await tx.reminders.findFirst({
    where: {
      pet_id: petId,
      reminder_name: parentData.reminderName,
      reminder_date: reminderDate
    }
  })
  if (existingReminder)
    throw new ConflictError(
      'A reminder with this name and date already exists for this pet.'
    )

  // Validate recurrence end date if provided
  if (recurrence && recurrence.endDate) {
    const endDate = new Date(recurrence.endDate)
    if (endDate <= reminderDate) {
      throw new BadRequestError(
        'Recurrence end date must be after the reminder start date.'
      )
    }
  }

  const reminderTime = parentData.reminderTime
    ? new Date(`1970-01-01T${parentData.reminderTime}Z`)
    : null
  const tempReminder = {
    reminder_date: reminderDate,
    reminder_time: reminderTime
  } as reminders

  const isDateInPast = (date: Date): boolean => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0) // Normalize today to start of day UTC
    const checkDate = new Date(date)
    checkDate.setUTCHours(0, 0, 0, 0) // Normalize reminder date to start of day UTC
    return checkDate < today
  }

  let initialStatus: reminder_status
  let statusDoneAt: Date | null = null
  let statusBeforeDone: reminder_status | null = null
  let isHealth = false

  if (isDateInPast(reminderDate)) {
    // Cannot create recurring reminder for past dates
    if (recurrence) {
      throw new BadRequestError(
        'Cannot create a recurring reminder for a past date. Recurring reminders must have a future start date.'
      )
    }
    initialStatus = reminder_status.done
    statusDoneAt = reminderDate // Set completion date to reminder date
    statusBeforeDone = reminder_status.overdue // If toggled back, it would have been overdue
    if (
      parentData.categoryName &&
      healthCategories.includes(parentData.categoryName)
    ) {
      isHealth = true
    }
  } else {
    initialStatus = isReminderOverdue(tempReminder, new Date())
      ? reminder_status.overdue
      : reminder_status.to_do
  }

  // Transaction handling is done by the caller
  {
    // Step 1: If recurring, create the recurrence template FIRST
    let recurrenceId: string | null = null
    if (recurrence) {
      // Calculate template_start_date: if initial date matches pattern, use it; otherwise use first aligned date
      let templateStartDate = reminderDate

      if (
        recurrence.frequency === RecurrenceFrequency.WEEKLY &&
        recurrence.daysOfWeek
      ) {
        // Check if initial date matches the weekly pattern
        const dayBit = 1 << reminderDate.getUTCDay()
        if ((recurrence.daysOfWeek & dayBit) === 0) {
          // Initial date doesn't match pattern, find first aligned date
          for (let i = 1; i <= 30; i++) {
            const checkDate = new Date(reminderDate.getTime())
            checkDate.setUTCDate(reminderDate.getUTCDate() + i)
            const checkDayBit = 1 << checkDate.getUTCDay()
            if ((recurrence.daysOfWeek & checkDayBit) > 0) {
              templateStartDate = checkDate
              break
            }
          }
        }
      } else if (
        recurrence.frequency === RecurrenceFrequency.MONTHLY &&
        recurrence.dayOfMonth
      ) {
        // For monthly, check if day matches
        if (reminderDate.getUTCDate() !== recurrence.dayOfMonth) {
          // Find first aligned date
          const checkDate = new Date(reminderDate.getTime())
          checkDate.setUTCDate(recurrence.dayOfMonth)
          if (checkDate < reminderDate) {
            checkDate.setUTCMonth(reminderDate.getUTCMonth() + 1)
          }
          templateStartDate = checkDate
        }
      }
      // For DAILY and YEARLY, the date itself is usually aligned, so use it as-is

      const newRecurrence = await tx.recurrence.create({
        data: {
          reminder_name: parentData.reminderName,
          description: parentData.description,
          category_name: parentData.categoryName,
          recurrence_status: RecurrenceStatusEnum.ACTIVE,
          frequency: recurrence.frequency,
          interval: recurrence.interval,
          reminder_time: reminderTime,
          daysOfWeek: recurrence.daysOfWeek,
          dayOfMonth: recurrence.dayOfMonth,
          template_start_date: templateStartDate,
          endDate: recurrence.endDate
            ? new Date(recurrence.endDate)
            : undefined,
          endAfterOccurrences: recurrence.endAfterOccurrences,
        },
      })
      recurrenceId = newRecurrence.id
    }

    // Step 2: Create the parent reminder instance, linking to recurrence template if applicable
    const parentReminder = await tx.reminders.create({
      data: {
        reminder_name: parentData.reminderName,
        description: parentData.description,
        category_name: parentData.categoryName,
        reminder_date: reminderDate,
        reminder_time: reminderTime,
        reminder_status: initialStatus,
        status_done_at: statusDoneAt,
        status_before_done: statusBeforeDone,
        is_health: isHealth,
        user: { connect: { id: userId } },
        pets: { connect: { id: petId } },
        ...(recurrenceId && {
          recurrence_template: { connect: { id: recurrenceId } },
        }), // Link to recurrence template via relation
      },
    })

    // Step 3: Create children if provided
    if (children && children.length > 0) {
      const childrenData = children.map((child) => {
        const childReminderDate = new Date(child.reminderDate)
        const childReminderTime = child.reminderTime
          ? new Date(`1970-01-01T${child.reminderTime}Z`)
          : null
        const childTempReminder = {
          reminder_date: childReminderDate,
          reminder_time: childReminderTime
        } as reminders

        let childInitialStatus: reminder_status
        let childStatusDoneAt: Date | null = null
        let childStatusBeforeDone: reminder_status | null = null
        let childIsHealth = false

        if (isDateInPast(childReminderDate)) {
          childInitialStatus = reminder_status.done
          childStatusDoneAt = childReminderDate
          childStatusBeforeDone = reminder_status.overdue
          if (
            child.categoryName &&
            healthCategories.includes(child.categoryName)
          ) {
            childIsHealth = true
          }
        } else {
          childInitialStatus = isReminderOverdue(childTempReminder, new Date())
            ? reminder_status.overdue
            : reminder_status.to_do
        }

        return {
          reminder_name: child.reminderName,
          description: child.description,
          category_name: child.categoryName,
          reminder_date: childReminderDate,
          reminder_time: childReminderTime,
          reminder_status: childInitialStatus,
          status_done_at: childStatusDoneAt,
          status_before_done: childStatusBeforeDone,
          is_health: childIsHealth,
          user_id: userId,
          pet_id: petId,
          parent_id: parentReminder.id
        }
      })
      await tx.reminders.createMany({ data: childrenData })
    }

    const fullReminder = await tx.reminders.findUnique({
      where: { id: parentReminder.id },
      include: { children: true, recurrence_template: true }
    })
    if (!fullReminder) throw new Error('Failed to retrieve created reminder.')
    return fullReminder
  }
}

export const createNewReminder = async (
  newReminderData: CreateReminderPayload,
  userId: string,
): Promise<reminders[]> => {
  const { petId: petIds, ...restData } = newReminderData
  return await prisma.$transaction(async (tx) => {
    const results: reminders[] = []
    for (const petId of petIds) {
      results.push(
        await createReminderInTransaction(tx, { ...restData, petId }, userId),
      )
    }
    return results
  })
}

export const createMultipleReminders = async (
  remindersData: CreateMultipleRemindersPayload,
  userId: string,
): Promise<{
  created: reminders[]
  errors: Array<{ index: number; reminderName: string; error: string }>
}> => {
  const created: reminders[] = []
  const errors: Array<{ index: number; reminderName: string; error: string }> =
    []

  if (remindersData.length === 0) {
    throw new BadRequestError('At least one reminder must be provided.')
  }

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < remindersData.length; i++) {
        try {
          const reminder = await createReminderInTransaction(
            tx,
            remindersData[i],
            userId,
          )
          created.push(reminder)
        } catch (err: any) {
          // Continue creating other reminders even if one fails
          errors.push({
            index: i,
            reminderName: remindersData[i].reminderName,
            error: err.message || 'Unknown error occurred',
          })
        }
      }
    },
    {
      // Use serializable isolation to ensure consistency across all reminders
      isolationLevel: 'Serializable',
    },
  )

  return { created, errors }
}

export const toggleReminderStatus = async (
  id: string,
  userId: string
): Promise<ReminderWithPetName> => {
  const reminderToToggle = await reminderRepository.findFullById(id)
  if (!reminderToToggle) throw new NotFoundError('Reminder not found')
  if (reminderToToggle.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder' }
    ])

  await prisma.$transaction(async (tx) => {
    let newStatus: reminder_status
    let newStatusBeforeDone: reminder_status | null =
      reminderToToggle.status_before_done
    let newStatusDoneAt: Date | null = reminderToToggle.status_done_at
    let isHealthRecord = reminderToToggle.is_health

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
        is_health: isHealthRecord
      }
    })

    if (newStatus === reminder_status.done) {
      // If this reminder is linked to a recurrence template, generate next instance
      await generateNextInstance(tx, reminderToToggle)
    }

    if (reminderToToggle.parent_id) {
      const parentId = reminderToToggle.parent_id
      const siblings = await tx.reminders.findMany({
        where: { parent_id: parentId }
      })
      const allChildrenDone = siblings.every((r) =>
        r.id === id ? newStatus === 'done' : r.reminder_status === 'done'
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
              is_health: true
            }
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
              status_done_at: null
            }
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
  updateData: UpdateReminderPayload
): Promise<FullReminderDto> => {
  const { editScope, recurrence, ...reminderUpdateData } = updateData

  const reminderToUpdate = await reminderRepository.findFullById(reminderId)
  if (!reminderToUpdate) throw new NotFoundError('Reminder not found')
  if (reminderToUpdate.user_id !== userId)
    throw new ApiError('Forbidden', 403, [
      { message: 'User is not the owner of this reminder' }
    ])

  const isChangingDateOrRecurrence =
    updateData.reminderDate || updateData.reminderTime || updateData.recurrence
  if (
    reminderToUpdate.reminder_status === 'done' &&
    isChangingDateOrRecurrence
  ) {
    throw new BadRequestError(
      'Cannot change date, time, or recurrence of a reminder that is marked as "done".'
    )
  }

  // Validate recurrence end date if provided
  if (recurrence && recurrence.endDate) {
    const reminderDate = updateData.reminderDate
      ? new Date(updateData.reminderDate)
      : reminderToUpdate.reminder_date
    const endDate = new Date(recurrence.endDate)
    if (endDate <= reminderDate) {
      throw new BadRequestError(
        'Recurrence end date must be after the reminder start date.'
      )
    }
  }

  const isRecurring =
    reminderToUpdate.recurrence_id !== null &&
    reminderToUpdate.recurrence_id !== undefined

  //--- "SPLIT THE SERIES" LOGIC (THIS_AND_FUTURE_INSTANCES) ---
  if (isRecurring && editScope === 'THIS_AND_FUTURE_INSTANCES') {
    const originalRecurrenceId = reminderToUpdate.recurrence_id!
    const originalRecurrence = reminderToUpdate.recurrence_template

    if (!originalRecurrence)
      throw new BadRequestError(
        'Original recurrence template not found for update.'
      )

    const updatedResult = await prisma.$transaction(async (tx) => {
      // 1. Mark the ORIGINAL recurrence template as INACTIVE (preserve history)
      await tx.recurrence.update({
        where: { id: originalRecurrenceId },
        data: { recurrence_status: RecurrenceStatusEnum.INACTIVE }
      })

      // 2. Delete any FUTURE instances (not done) linked to the original recurrence
      await tx.reminders.deleteMany({
        where: {
          recurrence_id: originalRecurrenceId,
          reminder_date: { gt: reminderToUpdate.reminder_date },
          reminder_status: { in: ['to_do', 'overdue'] }
        }
      })

      // 3. Create NEW recurrence template with updated rules and metadata
      const newReminderTime = reminderUpdateData.reminderTime
        ? new Date(`1970-01-01T${reminderUpdateData.reminderTime}Z`)
        : reminderToUpdate.reminder_time

      // Calculate template_start_date for the new recurrence based on updated reminder date
      const newReminderDate = reminderUpdateData.reminderDate
        ? new Date(reminderUpdateData.reminderDate)
        : reminderToUpdate.reminder_date
      let newTemplateStartDate = newReminderDate

      if (
        recurrence?.frequency === RecurrenceFrequency.WEEKLY &&
        recurrence.daysOfWeek
      ) {
        const dayBit = 1 << newReminderDate.getUTCDay()
        if ((recurrence.daysOfWeek & dayBit) === 0) {
          for (let i = 1; i <= 30; i++) {
            const checkDate = new Date(newReminderDate.getTime())
            checkDate.setUTCDate(newReminderDate.getUTCDate() + i)
            const checkDayBit = 1 << checkDate.getUTCDay()
            if ((recurrence.daysOfWeek & checkDayBit) > 0) {
              newTemplateStartDate = checkDate
              break
            }
          }
        }
      } else if (
        recurrence?.frequency === RecurrenceFrequency.MONTHLY &&
        recurrence.dayOfMonth
      ) {
        if (newReminderDate.getUTCDate() !== recurrence.dayOfMonth) {
          const checkDate = new Date(newReminderDate.getTime())
          checkDate.setUTCDate(recurrence.dayOfMonth)
          if (checkDate < newReminderDate) {
            checkDate.setUTCMonth(newReminderDate.getUTCMonth() + 1)
          }
          newTemplateStartDate = checkDate
        }
      }

      const newRecurrence = await tx.recurrence.create({
        data: {
          reminder_name:
            reminderUpdateData.reminderName ?? reminderToUpdate.reminder_name,
          description:
            reminderUpdateData.description ?? reminderToUpdate.description,
          category_name:
            reminderUpdateData.categoryName ?? reminderToUpdate.category_name,
          recurrence_status: RecurrenceStatusEnum.ACTIVE,
          frequency: recurrence?.frequency ?? originalRecurrence.frequency,
          interval: recurrence?.interval ?? originalRecurrence.interval,
          daysOfWeek: recurrence?.daysOfWeek ?? originalRecurrence.daysOfWeek,
          dayOfMonth: recurrence?.dayOfMonth ?? originalRecurrence.dayOfMonth,
          reminder_time: newReminderTime,
          template_start_date: newTemplateStartDate,
          endDate: recurrence?.endDate
            ? new Date(recurrence.endDate)
            : originalRecurrence.endDate,
          endAfterOccurrences:
            recurrence?.endAfterOccurrences ??
            originalRecurrence.endAfterOccurrences,
        },
      })

      // 4. Update the current instance to link to the NEW recurrence template
      const updatedReminder = await tx.reminders.update({
        where: { id: reminderToUpdate.id },
        data: {
          recurrence_id: newRecurrence.id, // Link to NEW recurrence template
          reminder_name:
            reminderUpdateData.reminderName ?? reminderToUpdate.reminder_name,
          description:
            reminderUpdateData.description ?? reminderToUpdate.description,
          category_name:
            reminderUpdateData.categoryName ?? reminderToUpdate.category_name,
          reminder_date: reminderUpdateData.reminderDate
            ? new Date(reminderUpdateData.reminderDate)
            : reminderToUpdate.reminder_date,
          reminder_time: newReminderTime
        }
      })

      return updatedReminder
    })

    const finalUpdatedReminder = await reminderRepository.findFullById(
      updatedResult.id
    )
    if (!finalUpdatedReminder)
      throw new Error('Failed to retrieve updated reminder.')
    return mapFullPrismaReminderToFullReminderDto(finalUpdatedReminder)
  }

  //--- LOGIC FOR EDITING A SINGLE INSTANCE (THIS_INSTANCE_ONLY) ---
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
    reminder_time: finalTime
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
      'Request body must contain at least one valid field to update.'
    )
  }

  // Use transaction to handle parent + child updates atomically
  await prisma.$transaction(async (tx) => {
    // Update parent reminder
    await tx.reminders.update({
      where: { id: reminderId },
      data: dataToUpdate
    })

    // If this is a recurring reminder, also update the recurrence template
    // so that future virtual instances reflect the changes
    if (reminderToUpdate.recurrence_id) {
      const recurrenceUpdateData: Prisma.recurrenceUpdateInput = {}

      if (reminderUpdateData.reminderName) {
        recurrenceUpdateData.reminder_name = reminderUpdateData.reminderName
      }
      if (reminderUpdateData.description !== undefined) {
        recurrenceUpdateData.description = reminderUpdateData.description
      }
      if (reminderUpdateData.categoryName) {
        recurrenceUpdateData.category_name = reminderUpdateData.categoryName
      }

      // Only update if there are fields to update
      if (Object.keys(recurrenceUpdateData).length > 0) {
        await tx.recurrence.update({
          where: { id: reminderToUpdate.recurrence_id },
          data: recurrenceUpdateData
        })
      }
    }

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
          reminder_time: childReminderTime
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
              reminder_status: childStatus
            }
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
              parent_id: reminderId
            }
          })
        }
      }
    }

    // Delete children if specified
    if (updateData.childrenToDelete && updateData.childrenToDelete.length > 0) {
      await tx.reminders.deleteMany({
        where: {
          id: { in: updateData.childrenToDelete },
          parent_id: reminderId
        }
      })
    }

    // Handle recurrence updates
    if (recurrence !== undefined) {
      if (recurrence === null) {
        // Delete recurrence if explicitly set to null (make it non-recurring)
        if (reminderToUpdate.recurrence_id) {
          // Just unlink from the recurrence template (preserve it for historical instances)
          await tx.reminders.update({
            where: { id: reminderId },
            data: { recurrence_id: null }
          })
        }
      } else {
        // Update or create recurrence
        const finalTime = reminderUpdateData.reminderTime
          ? new Date(`1970-01-01T${reminderUpdateData.reminderTime}Z`)
          : reminderToUpdate.reminder_time

        if (reminderToUpdate.recurrence_id) {
          // Update existing recurrence template
          await tx.recurrence.update({
            where: { id: reminderToUpdate.recurrence_id },
            data: {
              reminder_name: recurrence.reminderName,
              description: recurrence.description,
              category_name: recurrence.categoryName,
              frequency: recurrence.frequency,
              interval: recurrence.interval,
              daysOfWeek: recurrence.daysOfWeek,
              dayOfMonth: recurrence.dayOfMonth ?? null,
              reminder_time: finalTime,
              endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
              endAfterOccurrences: recurrence.endAfterOccurrences ?? null
            }
          })
        } else {
          // Create new recurrence template and link the reminder to it
          // Calculate template_start_date based on current reminder date
          let thisInstanceTemplateStartDate = reminderToUpdate.reminder_date

          if (
            recurrence.frequency === RecurrenceFrequency.WEEKLY &&
            recurrence.daysOfWeek
          ) {
            const dayBit = 1 << reminderToUpdate.reminder_date.getUTCDay()
            if ((recurrence.daysOfWeek & dayBit) === 0) {
              for (let i = 1; i <= 30; i++) {
                const checkDate = new Date(
                  reminderToUpdate.reminder_date.getTime(),
                )
                checkDate.setUTCDate(
                  reminderToUpdate.reminder_date.getUTCDate() + i,
                )
                const checkDayBit = 1 << checkDate.getUTCDay()
                if ((recurrence.daysOfWeek & checkDayBit) > 0) {
                  thisInstanceTemplateStartDate = checkDate
                  break
                }
              }
            }
          } else if (
            recurrence.frequency === RecurrenceFrequency.MONTHLY &&
            recurrence.dayOfMonth
          ) {
            if (
              reminderToUpdate.reminder_date.getUTCDate() !==
              recurrence.dayOfMonth
            ) {
              const checkDate = new Date(
                reminderToUpdate.reminder_date.getTime(),
              )
              checkDate.setUTCDate(recurrence.dayOfMonth)
              if (checkDate < reminderToUpdate.reminder_date) {
                checkDate.setUTCMonth(
                  reminderToUpdate.reminder_date.getUTCMonth() + 1,
                )
              }
              thisInstanceTemplateStartDate = checkDate
            }
          }

          const newRecurrence = await tx.recurrence.create({
            data: {
              reminder_name: recurrence.reminderName,
              description: recurrence.description,
              category_name: recurrence.categoryName,
              recurrence_status: RecurrenceStatusEnum.ACTIVE,
              frequency: recurrence.frequency,
              interval: recurrence.interval,
              daysOfWeek: recurrence.daysOfWeek,
              dayOfMonth: recurrence.dayOfMonth ?? null,
              reminder_time: finalTime,
              template_start_date: thisInstanceTemplateStartDate,
              endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
              endAfterOccurrences: recurrence.endAfterOccurrences ?? null
            }
          })
          await tx.reminders.update({
            where: { id: reminderId },
            data: { recurrence_id: newRecurrence.id }
          })
        }
      }
    }
  })

  const updatedReminder = await reminderRepository.findFullById(reminderId)
  if (!updatedReminder)
    throw new Error('Failed to retrieve reminder after update.')
  return mapFullPrismaReminderToFullReminderDto(updatedReminder)
}

export const updateOverdueReminders = async (): Promise<void> => {
  const now = new Date()
  const remindersToCheck = await prisma.reminders.findMany({
    where: {
      reminder_status: 'to_do',
      reminder_date: { lte: now },
      pets: { status: 'ACTIVE' } // Only check reminders for active pets
    }
  })
  const remindersToUpdate = remindersToCheck.filter((r) =>
    isReminderOverdue(r, now)
  )
  if (remindersToUpdate.length > 0) {
    const idsToUpdate = remindersToUpdate.map((r) => r.id)
    await reminderRepository.updateStatusForIds(
      idsToUpdate,
      reminder_status.overdue
    )
    console.log(`Updated ${idsToUpdate.length} reminders to overdue.`)
  }
}
