import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import {
  generateAllVirtualReminders,
  mergeRealAndVirtualReminders
} from '@/src/utils/recurring_reminder_generator'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { PanResponder, StyleSheet, View } from 'react-native'
import Header from '../../components/header_component'
import TodayRemindersModal from '../../components/today_reminders_modal'
import Calendar from '../components/calendar_component'
import ReminderList from '../components/reminder_list'

dayjs.extend(isSameOrBefore)

export default function ReminderPage() {
  // ------------------
  // CONST
  // ------------------
  const params = useLocalSearchParams<{ reminderId?: string }>()
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false)
  const swipeStartY = useRef(0)

  // ------------------
  // FETCH
  // ------------------
  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false
  })

  const loadReminders = useCallback(() => {
    getRemindersApi.execute({})
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadReminders()
    }, [loadReminders])
  )

  const reminders = getRemindersApi.data?.data?.reminders || []
  const recurringRules = getRemindersApi.data?.data?.recurringRules || []
  const safeReminders = Array.isArray(reminders) ? reminders : []

  const remindersWithRecurrence = safeReminders.map((reminder) => {
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
  })

  // Generate virtual reminders and merge with real ones
  const allReminders = useMemo(() => {
    const virtualReminders = generateAllVirtualReminders(
      recurringRules,
      {
        monthsForward: 6,
        monthsBackward: 1,
        maxOccurrences: 100
      },
      safeReminders // Pass real reminders to copy pet_name
    )

    return mergeRealAndVirtualReminders(
      remindersWithRecurrence,
      virtualReminders
    )
  }, [remindersWithRecurrence, recurringRules, safeReminders])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        )
      },
      onPanResponderGrant: (_, gestureState) => {
        swipeStartY.current = gestureState.y0
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeDistance = gestureState.dy
        const swipeVelocity = gestureState.vy

        if (swipeDistance < -50 || swipeVelocity < -0.5) {
          if (isCalendarExpanded) {
            setIsCalendarExpanded(false)
          }
        } else if (swipeDistance > 50 || swipeVelocity > 0.5) {
          if (!isCalendarExpanded) {
            setIsCalendarExpanded(true)
          }
        }
      }
    })
  ).current

  // ------------------
  // HANDLER
  // ------------------
  const handleToggleCalendar = () => {
    setIsCalendarExpanded(!isCalendarExpanded)
  }

  const handleDateSelect = (date: Date) => {
    if (!hasUserSelectedDate) {
      setHasUserSelectedDate(true)
    }
    setSelectedDate(date)
  }

  const handleReset = () => {
    setHasUserSelectedDate(false)
    setSelectedDate(new Date())
  }

  /**
   * Virtual Reminder Filtering Logic:
   *
   * Main List (No Date Selected):
   * - Shows ALL real reminders (past, present, future)
   * - Shows ONLY past/present virtual reminders
   * - Excludes future virtual reminders to avoid clutter
   *
   * Date-Filtered View:
   * - Shows ALL reminders (including virtual) for the selected date
   * - Allows users to see projected recurring reminders for future dates
   *
   * This approach gives users:
   * 1. Clean main list without infinite virtual future items
   * 2. Complete view when they specifically select a date
   * 3. Ability to see their upcoming schedule in calendar
   */
  const filteredReminders =
    hasUserSelectedDate && selectedDate
      ? // When date is selected, show ALL reminders (including virtual)
        allReminders.filter((reminder) =>
          dayjs(reminder.reminderDate).isSame(selectedDate, 'day')
        )
      : // When no date selected, exclude virtual future reminders
        allReminders.filter((reminder) => {
          if (!reminder.isVirtual) return true
          // Only include virtual reminders if they are today or in the past
          return dayjs(reminder.reminderDate).isSameOrBefore(dayjs(), 'day')
        })

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
        onDateSelect={handleDateSelect}
        selectedDate={selectedDate}
        onReset={handleReset}
        hasUserSelectedDate={hasUserSelectedDate}
      />

      <View style={styles.reminderContainer} {...panResponder.panHandlers}>
        <ReminderList
          reminders={filteredReminders}
          isLoading={getRemindersApi.loading}
          onRefresh={loadReminders}
          initialReminderId={params.reminderId}
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
