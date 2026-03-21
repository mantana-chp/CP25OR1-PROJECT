import { IReminder } from '@/src/domain/reminder.domain'
import { IRecurringRule } from '@/src/utils/api/services/reminder_service'
import {
  generateAllVirtualReminders,
  IVirtualReminder,
  mergeRealAndVirtualReminders
} from '@/src/utils/recurring_reminder_generator'
import { useEffect, useMemo, useState } from 'react'
import { LayoutAnimation } from 'react-native'

interface NavigationRange {
  minDate: Date
  maxDate: Date
}

interface DayInfo {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  hasEvents?: boolean
  reminderCount?: number
  reminders?: Array<IReminder | IVirtualReminder>
  date: Date
  hasVirtualReminders?: boolean
  hasRealReminders?: boolean
}

interface SimplePet {
  id: string
  pet_name: string
}

const DEFAULT_FORWARD_MONTHS = 12
const DEFAULT_BACKWARD_MONTHS = 1
const DEFAULT_MAX_OCCURRENCES = 100
const MAX_FORWARD_MONTHS = 240
const MAX_OCCURRENCES_CAP = 2000

const WEEKDAY_BITMAP_MASKS = [1, 2, 4, 8, 16, 32, 64]

const isValidDate = (value: Date) => !Number.isNaN(value.getTime())

const getMonthDiff = (from: Date, to: Date) => {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  )
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const addWeeks = (date: Date, weeks: number) => addDays(date, weeks * 7)

const addMonths = (date: Date, months: number) => {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

const addYears = (date: Date, years: number) => {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

const countWeeklyOccurrencesPerInterval = (daysOfWeek: number | null) => {
  if (!daysOfWeek || daysOfWeek <= 0) {
    return 1
  }

  return WEEKDAY_BITMAP_MASKS.reduce((count, mask) => {
    return (daysOfWeek & mask) !== 0 ? count + 1 : count
  }, 0)
}

const estimateRuleHorizonDate = (rule: IRecurringRule): Date | null => {
  if (rule.endDate) {
    const endDate = new Date(rule.endDate)
    if (isValidDate(endDate)) {
      return endDate
    }
  }

  if (!rule.endAfterOccurrences || rule.endAfterOccurrences <= 0) {
    return null
  }

  const startDate = new Date(rule.template_start_date)
  if (!isValidDate(startDate)) {
    return null
  }

  const interval = Math.max(1, rule.interval || 1)
  const totalGaps = Math.max(0, rule.endAfterOccurrences - 1)

  switch (rule.frequency) {
    case 'DAILY':
      return addDays(startDate, totalGaps * interval)
    case 'WEEKLY': {
      const occurrencesPerInterval = Math.max(
        1,
        countWeeklyOccurrencesPerInterval(rule.daysOfWeek)
      )
      const intervalsNeeded = Math.ceil(totalGaps / occurrencesPerInterval)
      return addWeeks(startDate, intervalsNeeded * interval)
    }
    case 'MONTHLY':
      return addMonths(startDate, totalGaps * interval)
    case 'YEARLY':
      return addYears(startDate, totalGaps * interval)
    default:
      return null
  }
}

export const useCalendar = (
  reminders: IReminder[] = [],
  recurringRules: IRecurringRule[] = [],
  pets: SimplePet[] = []
) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [virtualReminders, setVirtualReminders] = useState<IVirtualReminder[]>(
    []
  )
  const today = new Date()

  const virtualGenerationConfig = useMemo(() => {
    const now = new Date()
    const defaultMaxDate = new Date(now.getFullYear() + 1, now.getMonth(), 1)

    let generationMaxDate = new Date(defaultMaxDate)
    let maxEndAfterOccurrences = DEFAULT_MAX_OCCURRENCES

    for (const reminder of reminders) {
      const reminderDate = new Date(reminder.reminderDate)
      if (isValidDate(reminderDate) && reminderDate > generationMaxDate) {
        generationMaxDate = reminderDate
      }
    }

    for (const rule of recurringRules) {
      if (rule.recurrence_status !== 'ACTIVE') {
        continue
      }

      if (
        typeof rule.endAfterOccurrences === 'number' &&
        rule.endAfterOccurrences > maxEndAfterOccurrences
      ) {
        maxEndAfterOccurrences = rule.endAfterOccurrences
      }

      const estimatedHorizon = estimateRuleHorizonDate(rule)
      if (estimatedHorizon && estimatedHorizon > generationMaxDate) {
        generationMaxDate = estimatedHorizon
      }
    }

    const monthsForward = Math.max(
      DEFAULT_FORWARD_MONTHS,
      Math.min(MAX_FORWARD_MONTHS, getMonthDiff(now, generationMaxDate) + 1)
    )

    const maxOccurrences = Math.min(
      MAX_OCCURRENCES_CAP,
      Math.max(DEFAULT_MAX_OCCURRENCES, maxEndAfterOccurrences + 10)
    )

    return {
      monthsForward,
      monthsBackward: DEFAULT_BACKWARD_MONTHS,
      maxOccurrences,
      generationMaxDate
    }
  }, [reminders, recurringRules])

  // Generate virtual reminders asynchronously (AsyncStorage requires async)
  useEffect(() => {
    const loadVirtualReminders = async () => {
      const virtuals = await generateAllVirtualReminders(
        recurringRules,
        {
          monthsForward: virtualGenerationConfig.monthsForward,
          monthsBackward: virtualGenerationConfig.monthsBackward,
          maxOccurrences: virtualGenerationConfig.maxOccurrences
        },
        reminders, // Pass real reminders to copy pet_name
        pets // Pass pets array for direct pet_name lookup
      )
      setVirtualReminders(virtuals)
    }

    if (recurringRules.length > 0) {
      loadVirtualReminders()
    } else {
      setVirtualReminders([])
    }
  }, [reminders, recurringRules, pets, virtualGenerationConfig])

  // Merge virtual reminders with real ones
  const allReminders = useMemo(() => {
    return mergeRealAndVirtualReminders(reminders, virtualReminders)
  }, [reminders, virtualReminders])

  // --- Navigation range ---
  // Default: 1 year backward and forward from today.
  // If any reminder falls outside that window, extend the boundary to include it.
  const navigationRange = useMemo((): NavigationRange => {
    const now = new Date()
    const defaultMin = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    const defaultMax = new Date(now.getFullYear() + 1, now.getMonth(), 1)

    const recurringMax = new Date(
      virtualGenerationConfig.generationMaxDate.getFullYear(),
      virtualGenerationConfig.generationMaxDate.getMonth(),
      1
    )
    const baselineMax = recurringMax > defaultMax ? recurringMax : defaultMax

    if (allReminders.length === 0) {
      return { minDate: defaultMin, maxDate: baselineMax }
    }

    const reminderTimes = allReminders.map((r) =>
      new Date(r.reminderDate).getTime()
    )
    const earliest = new Date(Math.min(...reminderTimes))
    const latest = new Date(Math.max(...reminderTimes))

    const minDate =
      earliest < defaultMin
        ? new Date(earliest.getFullYear(), earliest.getMonth(), 1)
        : defaultMin
    const maxDate =
      latest > baselineMax
        ? new Date(latest.getFullYear(), latest.getMonth(), 1)
        : baselineMax

    return { minDate, maxDate }
  }, [allReminders, virtualGenerationConfig.generationMaxDate])

  const canGoPrev = useMemo(() => {
    const prevMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    )
    return prevMonthStart >= navigationRange.minDate
  }, [currentDate, navigationRange])

  const canGoNext = useMemo(() => {
    const nextMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    )
    return nextMonthStart <= navigationRange.maxDate
  }, [currentDate, navigationRange])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const hasReminders = (date: Date) => {
    if (!Array.isArray(allReminders)) return false
    return allReminders.some((reminder) => {
      const reminderDate = new Date(reminder.reminderDate)
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const getReminderCount = (date: Date) => {
    if (!Array.isArray(allReminders)) return 0
    return allReminders.filter((reminder) => {
      const reminderDate = new Date(reminder.reminderDate)
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      )
    }).length
  }

  const getRemindersForDate = (date: Date) => {
    if (!Array.isArray(allReminders)) return []
    return allReminders.filter((reminder) => {
      const reminderDate = new Date(reminder.reminderDate)
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const getRemindersInfoForDate = (date: Date) => {
    const remindersForDate = getRemindersForDate(date)
    const hasVirtual = remindersForDate.some((r) => r.isVirtual === true)
    const hasReal = remindersForDate.some((r) => !r.isVirtual)

    return {
      reminders: remindersForDate,
      hasVirtualReminders: hasVirtual,
      hasRealReminders: hasReal,
      count: remindersForDate.length
    }
  }

  const renderCalendar = (): DayInfo[] => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days: DayInfo[] = []

    // Previous month's days
    const prevMonthDays = getDaysInMonth(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    )
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          prevMonthDays - i
        )
      })
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      )
      const isToday =
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()

      const remindersInfo = getRemindersInfoForDate(date)

      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        hasEvents: remindersInfo.count > 0,
        reminderCount: remindersInfo.count,
        reminders: remindersInfo.reminders,
        hasVirtualReminders: remindersInfo.hasVirtualReminders,
        hasRealReminders: remindersInfo.hasRealReminders,
        date
      })
    }

    return days
  }

  const getCurrentWeekDays = (): DayInfo[] => {
    const allDays = renderCalendar()
    const todayIndex = allDays.findIndex((d) => d.isToday)

    if (todayIndex === -1) {
      return allDays.slice(0, 7)
    }

    const rowIndex = Math.floor(todayIndex / 7)
    const startIndex = rowIndex * 7

    return allDays.slice(startIndex, startIndex + 7)
  }

  const previousMonth = () => {
    if (!canGoPrev) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    if (!canGoNext) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

  const goToToday = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(new Date())
  }

  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear()

  return {
    currentDate,
    today,
    isCurrentMonth,
    renderCalendar,
    getCurrentWeekDays,
    previousMonth,
    nextMonth,
    goToToday,
    canGoPrev,
    canGoNext,
    allReminders // Export merged reminders for use in other components
  }
}
