import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import {
  generateAllVirtualReminders,
  mergeRealAndVirtualReminders
} from '@/src/utils/recurring_reminder_generator'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [virtualReminders, setVirtualReminders] = useState<any[]>([])
  const swipeStartY = useRef(0)

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
    getRemindersApi.execute({})
  }, [])

  const loadPets = useCallback(() => {
    getPetsApi.execute()
  }, [])

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
  const pets = useMemo(
    () => getPetsApi.data?.data || [],
    [getPetsApi.data]
  )
  const safeReminders = useMemo(
    () => (Array.isArray(reminders) ? reminders : []),
    [reminders]
  )

  // Generate virtual reminders asynchronously (AsyncStorage requires async)
  useEffect(() => {
    const loadVirtualReminders = async () => {
      const virtuals = await generateAllVirtualReminders(
        recurringRules,
        {
          monthsForward: 6,
          monthsBackward: 1,
          maxOccurrences: 100
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
  }, [recurringRules, safeReminders, pets])

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

  // Generate virtual reminders and merge with real ones
  // Use requirePreviousDone: true for the list to only show virtual reminders when previous instances are done
  const allReminders = useMemo(() => {
    return mergeRealAndVirtualReminders(
      remindersWithRecurrence,
      virtualReminders,
      { requirePreviousDone: true }
    )
  }, [remindersWithRecurrence, virtualReminders])

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
        ? allReminders.filter((reminder) =>
            dayjs(reminder.reminderDate).isSame(selectedDate, 'day')
          )
        : allReminders.filter((reminder) => {
            if (!reminder.isVirtual) return true

            return dayjs(reminder.reminderDate).isSameOrBefore(dayjs(), 'day')
          }),
    [hasUserSelectedDate, selectedDate, allReminders]
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

      <View style={styles.reminderContainer} {...panResponder.panHandlers}>
        <ReminderList
          reminders={filteredReminders}
          pets={pets}
          isLoading={getRemindersApi.loading}
          onRefresh={loadReminders}
          initialReminderId={params.reminderId}
          selectedCategory={selectedCategory}
          onSelectedCategoryChange={setSelectedCategory}
          selectedPetId={selectedPetId}
          onSelectedPetIdChange={setSelectedPetId}
          isToday={isToday}
          allReminders={remindersWithRecurrence}
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
