/**
 * Virtual Recurring Reminder Generator
 *
 * This module provides utilities to generate "virtual" (display-only) reminder instances
 * from recurring rules without storing them in the database. This allows users to see
 * all future occurrences of recurring reminders in the calendar view.
 *
 * Key Concepts:
 * - **Virtual Reminders**: Display-only reminder instances generated on the frontend
 * - **Recurring Rules**: Patterns that define how reminders repeat
 * - **Merging**: Combining real (database) and virtual reminders, with real ones taking precedence
 *
 * Visual Distinction:
 * - Calendar dots: All reminders (real and virtual) show filled dots with category colors
 * - Virtual reminders have light gray background in list view and cannot be edited
 * - Status toggle is disabled for virtual reminders to maintain data consistency
 *
 * Supported Frequencies:
 * - DAILY: Every N days
 * - WEEKLY: Specific days of the week (bitmap: 1=Sun, 2=Mon, 4=Tue, 8=Wed, 16=Thu, 32=Fri, 64=Sat)
 * - MONTHLY: Specific day of month
 * - YEARLY: Same date each year
 *
 * Usage:
 * 1. Get recurringRules from API (GET /v1/reminders)
 * 2. Call generateAllVirtualReminders(recurringRules, options)
 * 3. Merge with real reminders using mergeRealAndVirtualReminders()
 * 4. Display in calendar and reminder list
 *
 * Configuration:
 * - monthsForward: How far ahead to generate (default: 6 months)
 * - monthsBackward: How far back to generate (default: 1 month)
 * - maxOccurrences: Max instances per rule (default: 100)
 */

import { IReminder } from '@/src/domain/reminder.domain'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { IRecurringRule } from './api/services/reminder_service'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export interface IVirtualReminder extends IReminder {
  isVirtual: true
  originalRuleId: string
  virtualOccurrenceNumber: number
}

export interface GenerateVirtualRemindersOptions {
  /**
   * How many months forward to generate virtual instances
   * @default 6
   */
  monthsForward?: number

  /**
   * How many months backward to generate virtual instances
   * @default 1
   */
  monthsBackward?: number

  /**
   * Maximum number of occurrences to generate per rule
   * @default 100
   */
  maxOccurrences?: number
}

/**
 * Converts a daysOfWeek bitmap to an array of day indices
 * Bitmap: 1=Sun, 2=Mon, 4=Tue, 8=Wed, 16=Thu, 32=Fri, 64=Sat
 * Returns: [0-6] where 0=Sunday, 6=Saturday
 */
function parseDaysOfWeekBitmap(bitmap: number): number[] {
  const days: number[] = []
  const dayMap = [1, 2, 4, 8, 16, 32, 64] // Sun to Sat

  for (let i = 0; i < dayMap.length; i++) {
    if (bitmap & dayMap[i]) {
      days.push(i)
    }
  }

  return days
}

/**
 * Generate virtual reminder occurrences for a single recurring rule
 */
export function generateVirtualOccurrencesForRule(
  rule: IRecurringRule,
  options: GenerateVirtualRemindersOptions = {}
): IVirtualReminder[] {
  const {
    monthsForward = 6,
    monthsBackward = 1,
    maxOccurrences = 100
  } = options

  const virtualReminders: IVirtualReminder[] = []

  // Parse dates
  const startDate = dayjs(rule.template_start_date)
  const now = dayjs()
  const rangeStart = now.subtract(monthsBackward, 'month').startOf('day')
  const rangeEnd = now.add(monthsForward, 'month').endOf('day')

  // Create a set of excluded dates for fast lookup
  const excludedDatesSet = new Set<string>(rule.excluded_dates || [])

  // Debug: Log if there are excluded dates
  if (excludedDatesSet.size > 0) {
    console.log(
      `[${rule.reminder_name}] Excluding dates:`,
      Array.from(excludedDatesSet)
    )
  }

  // Determine end date from rule
  let effectiveEndDate = rangeEnd
  if (rule.endDate) {
    const ruleEndDate = dayjs(rule.endDate)
    effectiveEndDate = ruleEndDate.isBefore(rangeEnd) ? ruleEndDate : rangeEnd
  }

  let currentDate = startDate.isBefore(rangeStart) ? rangeStart : startDate
  let occurrenceCount = 0

  // Generate occurrences based on frequency
  switch (rule.frequency) {
    case 'DAILY':
      while (
        currentDate.isSameOrBefore(effectiveEndDate) &&
        occurrenceCount < maxOccurrences
      ) {
        if (currentDate.isSameOrAfter(rangeStart)) {
          // Check if we've exceeded endAfterOccurrences
          if (
            rule.endAfterOccurrences &&
            occurrenceCount >= rule.endAfterOccurrences
          ) {
            break
          }

          // Skip if this date has been excluded (deleted with 'THIS_INSTANCE_ONLY')
          const dateKey = currentDate.format('YYYY-MM-DD')
          if (!excludedDatesSet.has(dateKey)) {
            virtualReminders.push(
              createVirtualReminder(rule, currentDate, occurrenceCount + 1)
            )
            occurrenceCount++
          }
        } else {
          // Still increment occurrence count for dates before range
          occurrenceCount++
        }

        // Move to next occurrence based on interval
        currentDate = currentDate.add(rule.interval, 'day')
      }
      break

    case 'WEEKLY':
      // For weekly, we need to check specific days of the week
      const daysOfWeek = rule.daysOfWeek
        ? parseDaysOfWeekBitmap(rule.daysOfWeek)
        : [startDate.day()]

      // Start from the week of the start date
      let weekStart = currentDate.startOf('week')

      while (
        weekStart.isSameOrBefore(effectiveEndDate) &&
        occurrenceCount < maxOccurrences
      ) {
        // Check each selected day in this week
        for (const dayOfWeek of daysOfWeek) {
          const occurrenceDate = weekStart.day(dayOfWeek)

          // Only include if:
          // 1. Within our display range
          // 2. On or after the template start date
          // 3. Within endAfterOccurrences limit
          // 4. Not in excluded dates
          if (
            occurrenceDate.isSameOrAfter(startDate) &&
            occurrenceDate.isSameOrAfter(rangeStart) &&
            occurrenceDate.isSameOrBefore(effectiveEndDate)
          ) {
            if (
              rule.endAfterOccurrences &&
              occurrenceCount >= rule.endAfterOccurrences
            ) {
              break
            }

            // Skip if this date has been excluded (deleted with 'THIS_INSTANCE_ONLY')
            const dateKey = occurrenceDate.format('YYYY-MM-DD')
            if (!excludedDatesSet.has(dateKey)) {
              virtualReminders.push(
                createVirtualReminder(rule, occurrenceDate, occurrenceCount + 1)
              )
              occurrenceCount++
            }
          }
        }

        // Move to next week interval
        weekStart = weekStart.add(rule.interval, 'week')
      }
      break

    case 'MONTHLY':
      while (
        currentDate.isSameOrBefore(effectiveEndDate) &&
        occurrenceCount < maxOccurrences
      ) {
        if (
          currentDate.isSameOrAfter(rangeStart) &&
          currentDate.isSameOrAfter(startDate)
        ) {
          if (
            rule.endAfterOccurrences &&
            occurrenceCount >= rule.endAfterOccurrences
          ) {
            break
          }

          // Use dayOfMonth if specified, otherwise use the day from template_start_date
          const targetDay = rule.dayOfMonth || startDate.date()
          const occurrenceDate = currentDate.date(
            Math.min(targetDay, currentDate.daysInMonth())
          )

          // Skip if this date has been excluded (deleted with 'THIS_INSTANCE_ONLY')
          const dateKey = occurrenceDate.format('YYYY-MM-DD')
          if (!excludedDatesSet.has(dateKey)) {
            virtualReminders.push(
              createVirtualReminder(rule, occurrenceDate, occurrenceCount + 1)
            )
            occurrenceCount++
          }
        }

        // Move to next month interval
        currentDate = currentDate.add(rule.interval, 'month')
      }
      break

    case 'YEARLY':
      while (
        currentDate.isSameOrBefore(effectiveEndDate) &&
        occurrenceCount < maxOccurrences
      ) {
        if (
          currentDate.isSameOrAfter(rangeStart) &&
          currentDate.isSameOrAfter(startDate)
        ) {
          if (
            rule.endAfterOccurrences &&
            occurrenceCount >= rule.endAfterOccurrences
          ) {
            break
          }

          // Skip if this date has been excluded (deleted with 'THIS_INSTANCE_ONLY')
          const dateKey = currentDate.format('YYYY-MM-DD')
          if (!excludedDatesSet.has(dateKey)) {
            virtualReminders.push(
              createVirtualReminder(rule, currentDate, occurrenceCount + 1)
            )
            occurrenceCount++
          }
        }

        // Move to next year interval
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
    id: `virtual-${rule.id}-${occurrenceDate.format('YYYY-MM-DD')}`, // Unique ID for virtual instance
    userId: '', // Will be populated by the actual user context
    petId: rule.pet_id || '',
    pet_name: rule.pet_name || '',
    categoryName: rule.category_name || 'General',
    reminderName: rule.reminder_name,
    description: rule.description || '',
    reminderDate: occurrenceDate.format('YYYY-MM-DD'),
    reminderTime: rule.reminder_time,
    reminderStatus: 'to_do', // Virtual reminders are always "to do"
    statusUpdatedAt: '',
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
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

/**
 * Generate all virtual reminders from an array of recurring rules
 * Optionally accepts real reminders to copy pet_name from parent reminder
 */
export function generateAllVirtualReminders(
  recurringRules: IRecurringRule[],
  options: GenerateVirtualRemindersOptions = {},
  realReminders?: IReminder[]
): IVirtualReminder[] {
  const allVirtualReminders: IVirtualReminder[] = []

  // Create maps for quick lookup
  const reminderToPetName = new Map<string, string>()
  const petIdToPetName = new Map<string, string>()

  if (realReminders) {
    for (const reminder of realReminders) {
      // Map by reminder ID
      if (reminder.id && reminder.pet_name) {
        reminderToPetName.set(reminder.id, reminder.pet_name)
      }
      // Map by pet ID (fallback)
      if (reminder.petId && reminder.pet_name) {
        petIdToPetName.set(reminder.petId, reminder.pet_name)
      }
    }
  }

  for (const rule of recurringRules) {
    // Only generate for active rules
    if (rule.recurrence_status === 'ACTIVE') {
      const virtualReminders = generateVirtualOccurrencesForRule(rule, options)

      // If pet_name is missing or empty, try to get it from the parent reminder
      for (const virtualReminder of virtualReminders) {
        if (
          !virtualReminder.pet_name ||
          virtualReminder.pet_name.trim() === ''
        ) {
          // Try to get pet name by reminder_id first
          if (rule.reminder_id) {
            const petName = reminderToPetName.get(rule.reminder_id)
            if (petName) {
              virtualReminder.pet_name = petName
              continue
            }
          }

          // Fallback: Try to get pet name by pet_id
          if (rule.pet_id || virtualReminder.petId) {
            const petId = rule.pet_id || virtualReminder.petId
            const petName = petIdToPetName.get(petId)
            if (petName) {
              virtualReminder.pet_name = petName
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
 * Merge real reminders with virtual reminders, removing duplicates
 * Real reminders take precedence over virtual ones for the same date
 */
export function mergeRealAndVirtualReminders(
  realReminders: IReminder[],
  virtualReminders: IVirtualReminder[]
): Array<IReminder | IVirtualReminder> {
  // Create a set of dates that have real reminders
  const realReminderDates = new Set<string>()
  const realRemindersByRuleAndDate = new Map<string, IReminder>()

  for (const reminder of realReminders) {
    const dateKey = dayjs(reminder.reminderDate).format('YYYY-MM-DD')
    realReminderDates.add(dateKey)

    // Track by rule ID and date to filter out virtual instances
    if (reminder.recurrence?.id) {
      const key = `${reminder.recurrence.id}-${dateKey}`
      realRemindersByRuleAndDate.set(key, reminder)
    }
  }

  // Filter virtual reminders to exclude dates that already have real reminders
  const filteredVirtualReminders = virtualReminders.filter((virtual) => {
    const dateKey = dayjs(virtual.reminderDate).format('YYYY-MM-DD')
    const ruleKey = `${virtual.originalRuleId}-${dateKey}`

    // Exclude if there's already a real reminder for this rule on this date
    return !realRemindersByRuleAndDate.has(ruleKey)
  })

  // Combine and sort by date
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
