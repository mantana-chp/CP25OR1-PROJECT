import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import dayjs from 'dayjs'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import { PanResponder, StyleSheet, View } from 'react-native'
import Header from '../../components/header_component'
import TodayRemindersModal from '../../components/today_reminders_modal'
import Calendar from '../components/calendar_component'
import ReminderList from '../components/reminder_list'

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
        recurrence: recurringRule
      }
    }

    return reminder
  })

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

  const filteredReminders =
    hasUserSelectedDate && selectedDate
      ? remindersWithRecurrence.filter((reminder) =>
          dayjs(reminder.reminderDate).isSame(selectedDate, 'day')
        )
      : remindersWithRecurrence

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
