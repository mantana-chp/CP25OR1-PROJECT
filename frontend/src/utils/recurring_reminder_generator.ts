/**
 * Virtual Recurring Reminder Generator
 *
 * This module provides utilities to generate "virtual" (display-only) reminder instances
 * from recurring rules without storing them in the database. This allows users to see
 * all future occurrences of recurring reminders in the calendar view.
 */

import { IReminder } from '@/src/domain/reminder.domain'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { IRecurringRule } from './api/services/reminder_service'
import { getRuleExcludedDates } from './excluded_dates_storage'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export interface IVirtualReminder extends IReminder {
  isVirtual: true
  originalRuleId: string
  virtualOccurrenceNumber: number
}

export interface GenerateVirtualRemindersOptions {
  monthsForward?: number
  monthsBackward?: number
  maxOccurrences?: number
}

/**
 * Converts a daysOfWeek bitmap to an array of day indices
 * Bitmap: 1=Sun, 2=Mon, 4=Tue, 8=Wed, 16=Thu, 32=Fri, 64=Sat
 * Returns: [0-6] where 0=Sunday, 6=Saturday
 */
function parseDaysOfWeekBitmap(bitmap: number): number[] {
  const days: number[] = []
  const dayMap = [1, 2, 4, 8, 16, 32, 64]

  for (let i = 0; i < dayMap.length; i++) {
    if (bitmap & dayMap[i]) {
      days.push(i)
    }
  }

  return days
}

/**
 * Generate virtual reminder occurrences for a single recurring rule.
 *
 * Important behavior:
 * - Occurrence counting always starts from template_start_date so endAfterOccurrences is accurate.
 * - Virtual reminders are display-only and only shown from today onward.
 */
export async function generateVirtualOccurrencesForRule(
  rule: IRecurringRule,
  options: GenerateVirtualRemindersOptions = {}
): Promise<IVirtualReminder[]> {
  const {
    monthsForward = 6,
    monthsBackward = 1,
    maxOccurrences = 100
  } = options

  const virtualReminders: IVirtualReminder[] = []

  const startDate = dayjs(rule.template_start_date)
  const now = dayjs()
  const rangeStart = now.subtract(monthsBackward, 'month').startOf('day')
  const displayStart = now.startOf('day')
  const rangeEnd = now.add(monthsForward, 'month').endOf('day')

  const backendExcludedDates = rule.excluded_dates || []
  const localStorageExcludedDates = await getRuleExcludedDates(rule.id)
  const allExcludedDates = [...backendExcludedDates, ...localStorageExcludedDates]
  const excludedDatesSet = new Set<string>(allExcludedDates)

  let effectiveEndDate = rangeEnd
  if (rule.endDate) {
    const ruleEndDate = dayjs(rule.endDate)
    effectiveEndDate = ruleEndDate.isBefore(rangeEnd) ? ruleEndDate : rangeEnd
  }

  let currentDate = startDate
  let totalOccurrences = 0

  switch (rule.frequency) {
    case 'DAILY':
      while (
        currentDate.isSameOrBefore(effectiveEndDate) &&
        totalOccurrences < maxOccurrences
      ) {
        if (
          rule.endAfterOccurrences &&
          totalOccurrences >= rule.endAfterOccurrences
        ) {
          break
        }

        if (
          currentDate.isSameOrAfter(rangeStart) &&
          currentDate.isSameOrAfter(displayStart)
        ) {
          const dateKey = currentDate.format('YYYY-MM-DD')
          if (!excludedDatesSet.has(dateKey)) {
            virtualReminders.push(
              createVirtualReminder(rule, currentDate, totalOccurrences + 1)
            )
          }
        }

        totalOccurrences++
        currentDate = currentDate.add(rule.interval, 'day')
      }
      break

    case 'WEEKLY': {
      const daysOfWeek = rule.daysOfWeek
        ? parseDaysOfWeekBitmap(rule.daysOfWeek)
        : [startDate.day()]

      let weekStart = startDate.startOf('week')

      outerWeekly: while (
        weekStart.isSameOrBefore(effectiveEndDate) &&
        totalOccurrences < maxOccurrences
      ) {
        for (const dayOfWeek of daysOfWeek) {
          const occurrenceDate = weekStart.day(dayOfWeek)

          if (occurrenceDate.isBefore(startDate)) {
            continue
          }

          if (occurrenceDate.isAfter(effectiveEndDate)) {
            continue
          }

          if (
            rule.endAfterOccurrences &&
            totalOccurrences >= rule.endAfterOccurrences
          ) {
            break outerWeekly
          }

          if (
            occurrenceDate.isSameOrAfter(rangeStart) &&
            occurrenceDate.isSameOrAfter(displayStart)
          ) {
            const dateKey = occurrenceDate.format('YYYY-MM-DD')
            if (!excludedDatesSet.has(dateKey)) {
              virtualReminders.push(
                createVirtualReminder(rule, occurrenceDate, totalOccurrences + 1)
              )
            }
          }

          totalOccurrences++
        }

        weekStart = weekStart.add(rule.interval, 'week')
      }
      break
    }

    case 'MONTHLY':
      while (
        currentDate.isSameOrBefore(effectiveEndDate) &&
        totalOccurrences < maxOccurrences
      ) {
        if (
          rule.endAfterOccurrences &&
          totalOccurrences >= rule.endAfterOccurrences
        ) {
          break
        }

        const targetDay = rule.dayOfMonth || startDate.date()
        const occurrenceDate = currentDate.date(
          Math.min(targetDay, currentDate.daysInMonth())
        )

        if (occurrenceDate.isSameOrAfter(startDate)) {
          if (
            occurrenceDate.isSameOrAfter(rangeStart) &&
            occurrenceDate.isSameOrAfter(displayStart)
          ) {
            const dateKey = occurrenceDate.format('YYYY-MM-DD')
            if (!excludedDatesSet.has(dateKey)) {
              virtualReminders.push(
                createVirtualReminder(rule, occurrenceDate, totalOccurrences + 1)
              )
            }
          }

          totalOccurrences++
        }

        currentDate = currentDate.add(rule.interval, 'month')
      }
      break

    case 'YEARLY':
      while (
        currentDate.isSameOrBefore(effectiveEndDate) &&
        totalOccurrences < maxOccurrences
      ) {
        if (
          rule.endAfterOccurrences &&
          totalOccurrences >= rule.endAfterOccurrences
        ) {
          break
        }

        if (
          currentDate.isSameOrAfter(rangeStart) &&
          currentDate.isSameOrAfter(displayStart)
        ) {
          const dateKey = currentDate.format('YYYY-MM-DD')
          if (!excludedDatesSet.has(dateKey)) {
            virtualReminders.push(
              createVirtualReminder(rule, currentDate, totalOccurrences + 1)
            )
          }
        }

        totalOccurrences++
        currentDate = currentDate.add(rule.interval, 'year')
      }
      break
  }

  return virtualReminders
}

/**
 * Create a virtual reminder instance from a recurring rule
 */
function createVirtualReminder(
  rule: IRecurringRule,
  occurrenceDate: dayjs.Dayjs,
  occurrenceNumber: number
): IVirtualReminder {
  return {
    id: `virtual-${rule.id}-${occurrenceDate.format('YYYY-MM-DD')}`,
    userId: '',
    petId: rule.pet_id || '',
    pet_name: rule.pet_name || '',
    categoryName: rule.category_name || 'General',
    reminderName: rule.reminder_name,
    description: rule.description || '',
    reminderDate: occurrenceDate.format('YYYY-MM-DD'),
    reminderTime: rule.reminder_time,
    reminderStatus: 'to_do',
    statusUpdatedAt: '',
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
    attachments: [],
    children: [],
    recurrence: {
      id: rule.id,
      reminderId: rule.reminder_id || rule.id,
      frequency: rule.frequency,
      interval: rule.interval,
      daysOfWeek: rule.daysOfWeek || undefined,
      dayOfMonth: rule.dayOfMonth || undefined,
      reminderTime: rule.reminder_time,
      endDate: rule.endDate || undefined,
      endAfterOccurrences: rule.endAfterOccurrences || undefined,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at
    },
    occurrenceNumber,
    isVirtual: true,
    originalRuleId: rule.id,
    virtualOccurrenceNumber: occurrenceNumber
  }
}

interface SimplePet {
  id: string
  pet_name: string
}

/**
 * Generate all virtual reminders from an array of recurring rules
 * Optionally accepts real reminders and pets array to copy pet_name
 */
export async function generateAllVirtualReminders(
  recurringRules: IRecurringRule[],
  options: GenerateVirtualRemindersOptions = {},
  realReminders?: IReminder[],
  pets?: SimplePet[]
): Promise<IVirtualReminder[]> {
  const allVirtualReminders: IVirtualReminder[] = []

  const reminderToPetName = new Map<string, string>()
  const reminderToPetId = new Map<string, string>()
  const petIdToPetName = new Map<string, string>()
  const recurrenceIdToPetInfo = new Map<string, { petId: string; petName: string }>()

  if (pets) {
    for (const pet of pets) {
      if (pet.id && pet.pet_name) {
        petIdToPetName.set(pet.id, pet.pet_name)
      }
    }
  }

  if (realReminders) {
    for (const reminder of realReminders) {
      if (reminder.id && reminder.pet_name) {
        reminderToPetName.set(reminder.id, reminder.pet_name)
      }
      if (reminder.id && reminder.petId) {
        reminderToPetId.set(reminder.id, reminder.petId)
      }

      if (
        reminder.petId &&
        reminder.pet_name &&
        !petIdToPetName.has(reminder.petId)
      ) {
        petIdToPetName.set(reminder.petId, reminder.pet_name)
      }

      const recurrenceId = reminder.recurrenceId || reminder.recurrence?.id
      if (recurrenceId && reminder.petId) {
        recurrenceIdToPetInfo.set(recurrenceId, {
          petId: reminder.petId,
          petName: reminder.pet_name || ''
        })
      }
    }
  }

  for (const rule of recurringRules) {
    if (rule.recurrence_status === 'ACTIVE') {
      const virtualReminders = await generateVirtualOccurrencesForRule(
        rule,
        options
      )

      for (const virtualReminder of virtualReminders) {
        if (!virtualReminder.pet_name || virtualReminder.pet_name.trim() === '') {
          const petInfo = recurrenceIdToPetInfo.get(rule.id)
          if (petInfo) {
            virtualReminder.petId = petInfo.petId
            const petName = petIdToPetName.get(petInfo.petId) || petInfo.petName
            if (petName) {
              virtualReminder.pet_name = petName
              continue
            }
          }

          if (rule.pet_id) {
            const petName = petIdToPetName.get(rule.pet_id)
            if (petName) {
              virtualReminder.pet_name = petName
              continue
            }
          }

          if (virtualReminder.petId) {
            const petName = petIdToPetName.get(virtualReminder.petId)
            if (petName) {
              virtualReminder.pet_name = petName
              continue
            }
          }

          if (rule.reminder_id) {
            const petName = reminderToPetName.get(rule.reminder_id)
            if (petName) {
              virtualReminder.pet_name = petName
              const petId = reminderToPetId.get(rule.reminder_id)
              if (petId) {
                virtualReminder.petId = petId
              }
            }
          }
        }
      }

      allVirtualReminders.push(...virtualReminders)
    }
  }

  return allVirtualReminders
}

/**
 * Merge real reminders with virtual reminders, removing duplicates.
 * Real reminders take precedence over virtual ones for the same date.
 */
export function mergeRealAndVirtualReminders(
  realReminders: IReminder[],
  virtualReminders: IVirtualReminder[],
  options: { requirePreviousDone?: boolean } = {}
): Array<IReminder | IVirtualReminder> {
  const { requirePreviousDone = false } = options

  const realRemindersByRuleAndDate = new Map<string, IReminder>()
  const realRemindersByRule = new Map<string, IReminder[]>()

  for (const reminder of realReminders) {
    if (reminder.recurrence?.id) {
      const ruleId = reminder.recurrence.id
      const dateKey = dayjs(reminder.reminderDate).format('YYYY-MM-DD')
      const key = `${ruleId}-${dateKey}`
      realRemindersByRuleAndDate.set(key, reminder)

      if (requirePreviousDone) {
        if (!realRemindersByRule.has(ruleId)) {
          realRemindersByRule.set(ruleId, [])
        }
        realRemindersByRule.get(ruleId)!.push(reminder)
      }
    }
  }

  const filteredVirtualReminders = virtualReminders.filter((virtual) => {
    const dateKey = dayjs(virtual.reminderDate).format('YYYY-MM-DD')
    const ruleKey = `${virtual.originalRuleId}-${dateKey}`

    if (realRemindersByRuleAndDate.has(ruleKey)) {
      return false
    }

    if (requirePreviousDone) {
      const remindersForThisRule =
        realRemindersByRule.get(virtual.originalRuleId) || []
      const virtualDate = dayjs(virtual.reminderDate)

      for (const realReminder of remindersForThisRule) {
        const realDate = dayjs(realReminder.reminderDate)

        if (realDate.isBefore(virtualDate)) {
          if (
            realReminder.reminderStatus === 'to_do' ||
            realReminder.reminderStatus === 'overdue'
          ) {
            return false
          }
        }
      }
    }

    return true
  })

  const combined = [...realReminders, ...filteredVirtualReminders]

  return combined.sort((a, b) => {
    const dateA = dayjs(a.reminderDate)
    const dateB = dayjs(b.reminderDate)
    return dateA.diff(dateB)
  })
}

/**
 * Check if a reminder is virtual
 */
export function isVirtualReminder(
  reminder: IReminder | IVirtualReminder
): reminder is IVirtualReminder {
  return 'isVirtual' in reminder && reminder.isVirtual === true
}
