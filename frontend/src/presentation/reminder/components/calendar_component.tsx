import _ from 'lodash'
import React from 'react'

import { IReminder } from '@/src/domain/reminder.domain'
import { IRecurringRule } from '@/src/utils/api/services/reminder_service'

import { useChevronAnimation } from '@/src/hooks/useChevronAnimation'
import { ChevronDown } from 'lucide-react-native'
import {
  Animated,
  LayoutAnimation,
  Platform,
  StyleSheet,
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

interface CalendarProps {
  isExpanded: boolean
  onToggle: () => void
  reminders?: IReminder[]
  recurringRules?: IRecurringRule[]
  onDateSelect: (date: Date) => void
  selectedDate: Date | null
  onReset: () => void
  hasUserSelectedDate: boolean
}

export default function Calendar({
  isExpanded,
  onToggle,
  reminders = [],
  recurringRules = [],
  onDateSelect,
  selectedDate,
  onReset,
  hasUserSelectedDate
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
    allReminders
  } = useCalendar(reminders, recurringRules)

  const chevronRotation = useChevronAnimation(isExpanded)

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
  }
})
