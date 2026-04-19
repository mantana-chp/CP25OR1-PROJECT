import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh'
import {
  generateAllVirtualReminders,
  mergeRealAndVirtualReminders
} from '@/src/utils/recurring_reminder_generator'
import { IRecurringRule } from '@/src/utils/api/services/reminder_service'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Header from '../../components/header_component'
import TodayRemindersModal from '../../components/today_reminders_modal'
import Calendar from '../components/calendar_component'
import ReminderList from '../components/reminder_list'

dayjs.extend(isSameOrBefore)

const DEFAULT_FORWARD_MONTHS = 12
const DEFAULT_BACKWARD_MONTHS = 1
const DEFAULT_MAX_OCCURRENCES = 100
const MAX_FORWARD_MONTHS = 240
const MAX_OCCURRENCES_CAP = 2000

const isValidDate = (value: Date) => !Number.isNaN(value.getTime())

const getMonthDiff = (from: Date, to: Date) => {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  )
}

const addYears = (date: Date, years: number) => {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
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
    case 'DAILY': {
      const next = new Date(startDate)
      next.setDate(next.getDate() + totalGaps * interval)
      return next
    }
    case 'WEEKLY': {
      const next = new Date(startDate)
      next.setDate(next.getDate() + totalGaps * interval * 7)
      return next
    }
    case 'MONTHLY': {
      const next = new Date(startDate)
      next.setMonth(next.getMonth() + totalGaps * interval)
      return next
    }
    case 'YEARLY':
      return addYears(startDate, totalGaps * interval)
    default:
      return null
  }
}

export default function ReminderPage() {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const params = useLocalSearchParams<{ reminderId?: string }>()
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [virtualReminders, setVirtualReminders] = useState<any[]>([])

  // ------------------
  // FETCH
  // ------------------
  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false
  })

  const getPetsApi = useApi(petProfileService.getMyPets, {
    showErrorAlert: false
  })

  const loadReminders = useCallback(() => {
    return getRemindersApi.execute({})
  }, [getRemindersApi.execute])

  const loadPets = useCallback(() => {
    return getPetsApi.execute()
  }, [getPetsApi.execute])

  const { isRefreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([loadReminders(), loadPets()])
  })

  useFocusEffect(
    useCallback(() => {
      loadReminders()
      loadPets()
    }, [loadReminders, loadPets])
  )

  const reminders = useMemo(
    () => getRemindersApi.data?.data?.reminders || [],
    [getRemindersApi.data]
  )
  const recurringRules = useMemo(
    () => getRemindersApi.data?.data?.recurringRules || [],
    [getRemindersApi.data]
  )
  const pets = useMemo(() => getPetsApi.data?.data || [], [getPetsApi.data])
  const safeReminders = useMemo(
    () => (Array.isArray(reminders) ? reminders : []),
    [reminders]
  )

  const virtualGenerationConfig = useMemo(() => {
    const now = new Date()
    const defaultMaxDate = new Date(now.getFullYear() + 1, now.getMonth(), 1)

    let generationMaxDate = new Date(defaultMaxDate)
    let maxEndAfterOccurrences = DEFAULT_MAX_OCCURRENCES

    for (const reminder of safeReminders) {
      const reminderDate = new Date(reminder.reminderDate)
      if (isValidDate(reminderDate) && reminderDate > generationMaxDate) {
        generationMaxDate = reminderDate
      }
    }

    for (const rule of recurringRules) {
      if (rule.recurrence_status !== 'ACTIVE') continue

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
      maxOccurrences
    }
  }, [safeReminders, recurringRules])

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
        safeReminders, // Pass real reminders to copy pet_name
        pets // Pass pets array for direct pet_name lookup
      )
      setVirtualReminders(virtuals)
    }

    if (recurringRules.length > 0) {
      loadVirtualReminders()
    } else {
      setVirtualReminders([])
    }
  }, [recurringRules, safeReminders, pets, virtualGenerationConfig])

  const remindersWithRecurrence = useMemo(
    () =>
      safeReminders.map((reminder) => {
        const recurringRule = Array.isArray(recurringRules)
          ? recurringRules.find((rule: any) => rule.reminder_id === reminder.id)
          : null

        if (recurringRule) {
          return {
            ...reminder,
            recurrence: recurringRule as any
          }
        }

        return reminder
      }),
    [safeReminders, recurringRules]
  )

  // Default list behavior: keep previous behavior to avoid clutter in general view.
  const allReminders = useMemo(() => {
    return mergeRealAndVirtualReminders(
      remindersWithRecurrence,
      virtualReminders,
      { requirePreviousDone: true }
    )
  }, [remindersWithRecurrence, virtualReminders])

  // Selected-date behavior: show planned virtual instances even if previous ones are not done.
  const allRemindersForSelectedDate = useMemo(() => {
    return mergeRealAndVirtualReminders(
      remindersWithRecurrence,
      virtualReminders
    )
  }, [remindersWithRecurrence, virtualReminders])

  // ------------------
  // HANDLER
  // ------------------
  const handleToggleCalendar = () => {
    setIsCalendarExpanded(!isCalendarExpanded)
  }

  const handleDateSelect = (date: Date) => {
    const isSelectingToday = dayjs(date).isSame(dayjs(), 'day')
    setHasUserSelectedDate(!isSelectingToday)
    setSelectedDate(date)
  }

  const handleReset = () => {
    setHasUserSelectedDate(false)
    setSelectedDate(new Date())
  }

  const filteredReminders = useMemo(
    () =>
      hasUserSelectedDate && selectedDate
        ? allRemindersForSelectedDate.filter((reminder) =>
            dayjs(reminder.reminderDate).isSame(selectedDate, 'day')
          )
        : allReminders.filter((reminder) => {
            if (!reminder.isVirtual) return true

            return dayjs(reminder.reminderDate).isSameOrBefore(dayjs(), 'day')
          }),
    [
      hasUserSelectedDate,
      selectedDate,
      allReminders,
      allRemindersForSelectedDate
    ]
  )

  const handleResetRemindersFilters = () => {
    setSelectedCategory(null)
    setSelectedPetId(null)
  }

  const isToday = dayjs(selectedDate).isSame(dayjs(), 'day')

  // ------------------
  // RENDER
  // ------------------
  return (
    <View style={styles.container}>
      <TodayRemindersModal />

      <Header title="ปฏิทิน" />
      <Calendar
        isExpanded={isCalendarExpanded}
        onToggle={handleToggleCalendar}
        reminders={remindersWithRecurrence}
        recurringRules={recurringRules}
        pets={pets}
        onDateSelect={handleDateSelect}
        selectedDate={selectedDate}
        onReset={handleReset}
        onResetFilters={handleResetRemindersFilters}
        hasUserSelectedDate={hasUserSelectedDate}
        isPetFilterActive={selectedPetId !== null}
        isCategoryFilterActive={selectedCategory !== null}
      />

      <View style={styles.reminderContainer}>
        <ReminderList
          reminders={filteredReminders}
          pets={pets}
          isLoading={getRemindersApi.loading}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          initialReminderId={params.reminderId}
          onInitialReminderHandled={() => {
            if (params.reminderId) {
              router.setParams({ reminderId: undefined })
            }
          }}
          selectedCategory={selectedCategory}
          onSelectedCategoryChange={setSelectedCategory}
          selectedPetId={selectedPetId}
          onSelectedPetIdChange={setSelectedPetId}
          isToday={isToday}
          allReminders={allReminders}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  reminderContainer: {
    flex: 1
  }
})
