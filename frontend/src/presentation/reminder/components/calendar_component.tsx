import _ from 'lodash'
import React, { useEffect, useRef, useState } from 'react'

import { IReminder } from '@/src/domain/reminder.domain'
import { IRecurringRule } from '@/src/utils/api/services/reminder_service'

import { useChevronAnimation } from '@/src/hooks/useChevronAnimation'
import { ChevronDown } from 'lucide-react-native'
import {
  Animated,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native'
import { useCalendar } from '../../../hooks/useCalendar'
import CalendarDay from './calendar/calendar_day'
import CalendarHeader from './calendar/calendar_header'
import WeekDaysRow from './calendar/week_days_row'

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface SimplePet {
  id: string
  pet_name: string
}

interface CalendarProps {
  isExpanded: boolean
  onToggle: () => void
  reminders?: IReminder[]
  recurringRules?: IRecurringRule[]
  pets?: SimplePet[]
  onDateSelect: (date: Date) => void
  selectedDate: Date | null
  onReset: () => void
  hasUserSelectedDate: boolean
  onResetFilters?: () => void
  isPetFilterActive?: boolean
  isCategoryFilterActive?: boolean
}

export default function Calendar({
  isExpanded,
  onToggle,
  reminders = [],
  recurringRules = [],
  pets = [],
  onDateSelect,
  selectedDate,
  onReset,
  hasUserSelectedDate,
  onResetFilters,
  isPetFilterActive,
  isCategoryFilterActive
}: CalendarProps) {
  // ------------------
  // CONST
  // ------------------
  const {
    currentDate,
    isCurrentMonth,
    renderCalendar,
    getCurrentWeekDays,
    previousMonth,
    nextMonth,
    goToToday,
    canGoPrev,
    canGoNext
  } = useCalendar(reminders, recurringRules, pets)

  const chevronRotation = useChevronAnimation(isExpanded)

  // ------------------
  // TOAST
  // ------------------
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMessage(message)
    setToastVisible(true)
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start()
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start(() => setToastVisible(false))
    }, 2200)
  }

  const handleLimitReached = (direction: 'prev' | 'next') => {
    showToast(
      direction === 'prev'
        ? 'ถึงขอบเขตการดูย้อนหลังแล้ว'
        : 'ถึงขอบเขตการดูล่วงหน้าแล้ว'
    )
  }

  // ------------------
  // HANDLER
  // ------------------
  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onToggle()
  }

  const handleDatePress = (date: Date) => {
    onDateSelect(date)
  }

  const handleHeaderReset = () => {
    goToToday()
    onReset()
  }

  const days = isExpanded ? renderCalendar() : getCurrentWeekDays()
  const showReset = hasUserSelectedDate || !isCurrentMonth

  // ------------------
  // RENDER
  // ------------------
  return (
    <View style={styles.container}>
      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
        onReset={handleHeaderReset}
        showReset={showReset}
        onResetFilters={onResetFilters}
        isPetFilterActive={isPetFilterActive}
        isCategoryFilterActive={isCategoryFilterActive}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onLimitReached={handleLimitReached}
      />

      <WeekDaysRow />

      <View style={styles.calendarGrid}>
        {_.map(days, (item, index) => (
          <CalendarDay
            key={`${item.date.getTime()}-${index}`}
            day={item.day}
            isCurrentMonth={item.isCurrentMonth}
            isToday={item.isToday}
            hasEvents={item.hasEvents}
            reminderCount={item.reminderCount}
            reminders={item.reminders}
            date={item.date}
            onPress={handleDatePress}
            selectedDate={selectedDate}
            hasVirtualReminders={item.hasVirtualReminders}
            hasRealReminders={item.hasRealReminders}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.toggleButton, isExpanded && styles.toggleButtonExpanded]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <ChevronDown size={24} color="#225877" />
        </Animated.View>
      </TouchableOpacity>

      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  toggleButton: {
    alignSelf: 'center',
    paddingBottom: 2,
    paddingHorizontal: 24,
    marginTop: 0,
    marginBottom: 8
  },
  toggleButtonExpanded: {
    marginTop: -32
  },
  toast: {
    position: 'absolute',
    bottom: 44,
    alignSelf: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 100,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  toastText: {
    color: '#92400e',
    fontSize: 13,
    fontFamily: 'Prompt_400Regular'
  }
})
