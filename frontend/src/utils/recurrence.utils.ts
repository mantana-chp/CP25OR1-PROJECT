import { IRecurrenceRule, Weekday } from '../domain/reminder.domain'

/**
 * Calculate the next occurrence date based on recurrence rule
 */
export const calculateNextOccurrence = (
  currentDate: Date,
  recurrenceRule: IRecurrenceRule
): Date | null => {
  const nextDate = new Date(currentDate)

  switch (recurrenceRule.type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + recurrenceRule.interval)
      break

    case 'weekly':
      if (recurrenceRule.weekdays && recurrenceRule.weekdays.length > 0) {
        return getNextWeekdayOccurrence(
          nextDate,
          recurrenceRule.weekdays,
          recurrenceRule.interval
        )
      } else {
        nextDate.setDate(nextDate.getDate() + 7 * recurrenceRule.interval)
      }
      break

    case 'monthly':
      if (recurrenceRule.monthlyType === 'last_day') {
        nextDate.setMonth(nextDate.getMonth() + recurrenceRule.interval)
        nextDate.setDate(0) // Last day of previous month
        nextDate.setMonth(nextDate.getMonth() + 1)
      } else if (recurrenceRule.dayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + recurrenceRule.interval)
        nextDate.setDate(
          Math.min(recurrenceRule.dayOfMonth, getLastDayOfMonth(nextDate))
        )
      } else {
        nextDate.setMonth(nextDate.getMonth() + recurrenceRule.interval)
      }
      break

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + recurrenceRule.interval)
      break

    case 'custom':
      nextDate.setDate(nextDate.getDate() + recurrenceRule.interval)
      break

    default:
      return null
  }

  // Check if we've exceeded end conditions
  if (recurrenceRule.endType === 'on_date' && recurrenceRule.endDate) {
    const endDate = new Date(recurrenceRule.endDate)
    if (nextDate > endDate) {
      return null
    }
  }

  return nextDate
}

/**
 * Get next occurrence for weekly recurrence with specific weekdays
 */
const getNextWeekdayOccurrence = (
  currentDate: Date,
  weekdays: Weekday[],
  interval: number
): Date => {
  const weekdayMap: Record<Weekday, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  }

  const targetDays = weekdays
    .map((day) => weekdayMap[day])
    .sort((a, b) => a - b)
  const currentDay = currentDate.getDay()
  let nextDate = new Date(currentDate)

  // Find next occurrence in current week
  const laterDaysInWeek = targetDays.filter((day) => day > currentDay)

  if (laterDaysInWeek.length > 0) {
    // Next occurrence is later this week
    const daysToAdd = laterDaysInWeek[0] - currentDay
    nextDate.setDate(nextDate.getDate() + daysToAdd)
  } else {
    // Next occurrence is in the next interval of weeks
    const weeksToAdd = interval
    const daysToAdd = weeksToAdd * 7 + (targetDays[0] - currentDay)
    nextDate.setDate(nextDate.getDate() + daysToAdd)
  }

  return nextDate
}

/**
 * Get last day of month for a given date
 */
const getLastDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Check if a reminder should generate next occurrence
 */
export const shouldGenerateNextOccurrence = (
  recurrenceRule: IRecurrenceRule,
  currentOccurrenceNumber: number
): boolean => {
  if (recurrenceRule.type === 'none') {
    return false
  }

  if (recurrenceRule.endType === 'never') {
    return true
  }

  if (
    recurrenceRule.endType === 'after' &&
    recurrenceRule.endAfterOccurrences
  ) {
    return currentOccurrenceNumber < recurrenceRule.endAfterOccurrences
  }

  return true
}

/**
 * Format recurrence rule to human-readable text
 */
export const formatRecurrenceText = (
  recurrenceRule: IRecurrenceRule,
  locale: 'th' | 'en' = 'th'
): string => {
  if (recurrenceRule.type === 'none') {
    return locale === 'th' ? 'ไม่ทำซ้ำ' : 'Does not repeat'
  }

  const { type, interval } = recurrenceRule
  let text = ''

  if (locale === 'th') {
    switch (type) {
      case 'daily':
        text = interval === 1 ? 'ทุกวัน' : `ทุก ${interval} วัน`
        break
      case 'weekly':
        if (recurrenceRule.weekdays && recurrenceRule.weekdays.length > 0) {
          const dayNames = recurrenceRule.weekdays.map((day) =>
            getWeekdayNameThai(day)
          )
          text =
            interval === 1
              ? `ทุกสัปดาห์ (${dayNames.join(', ')})`
              : `ทุก ${interval} สัปดาห์ (${dayNames.join(', ')})`
        } else {
          text = interval === 1 ? 'ทุกสัปดาห์' : `ทุก ${interval} สัปดาห์`
        }
        break
      case 'monthly':
        if (recurrenceRule.monthlyType === 'last_day') {
          text =
            interval === 1
              ? 'ทุกเดือน (วันสุดท้ายของเดือน)'
              : `ทุก ${interval} เดือน (วันสุดท้ายของเดือน)`
        } else if (recurrenceRule.dayOfMonth) {
          text =
            interval === 1
              ? `ทุกเดือน (วันที่ ${recurrenceRule.dayOfMonth})`
              : `ทุก ${interval} เดือน (วันที่ ${recurrenceRule.dayOfMonth})`
        } else {
          text = interval === 1 ? 'ทุกเดือน' : `ทุก ${interval} เดือน`
        }
        break
      case 'yearly':
        text = interval === 1 ? 'ทุกปี' : `ทุก ${interval} ปี`
        break
      case 'custom':
        text = `ทุก ${interval} วัน`
        break
    }

    // Add end condition
    if (
      recurrenceRule.endType === 'after' &&
      recurrenceRule.endAfterOccurrences
    ) {
      text += `, ${recurrenceRule.endAfterOccurrences} ครั้ง`
    } else if (recurrenceRule.endType === 'on_date' && recurrenceRule.endDate) {
      const endDate = new Date(recurrenceRule.endDate).toLocaleDateString(
        'th-TH'
      )
      text += `, จนถึง ${endDate}`
    }
  }

  return text
}

/**
 * Get weekday name in Thai
 */
const getWeekdayNameThai = (weekday: Weekday): string => {
  const names: Record<Weekday, string> = {
    sunday: 'อา',
    monday: 'จ',
    tuesday: 'อ',
    wednesday: 'พ',
    thursday: 'พฤ',
    friday: 'ศ',
    saturday: 'ส'
  }
  return names[weekday]
}

/**
 * Get full weekday name in Thai
 */
export const getWeekdayFullNameThai = (weekday: Weekday): string => {
  const names: Record<Weekday, string> = {
    sunday: 'อาทิตย์',
    monday: 'จันทร์',
    tuesday: 'อังคาร',
    wednesday: 'พุธ',
    thursday: 'พฤหัสบดี',
    friday: 'ศุกร์',
    saturday: 'เสาร์'
  }
  return names[weekday]
}

/**
 * Generate a unique series ID for recurring reminders
 */
export const generateSeriesId = (): string => {
  return `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
