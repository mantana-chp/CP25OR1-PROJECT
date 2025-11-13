import _ from 'lodash'
import React from 'react'

import { IReminder } from '@/src/domain/reminder.domain'

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
import { CalendarDay } from './calendar/CalendarDay'
import { CalendarHeader } from './calendar/CalendarHeader'
import { WeekDaysRow } from './calendar/WeekDaysRow'

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
}

export default function Calendar({
  isExpanded,
  onToggle,
  reminders = []
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
    goToToday
  } = useCalendar(reminders)

  const chevronRotation = useChevronAnimation(isExpanded)

  // ------------------
  // HANDLER
  // ------------------
  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onToggle()
  }

  const handleDatePress = (date: Date) => {
    console.log('Selected date:', date)
  }

  const days = isExpanded ? renderCalendar() : getCurrentWeekDays()

  // ------------------
  // RENDER
  // ------------------
  return (
    <View style={styles.container}>
      <CalendarHeader
        currentDate={currentDate}
        isCurrentMonth={isCurrentMonth}
        onPreviousMonth={previousMonth}
        onNextMonth={nextMonth}
        onGoToToday={goToToday}
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
            date={item.date}
            onPress={handleDatePress}
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
    paddingVertical: 2,
    paddingHorizontal: 24,
    marginTop: 0
  },
  toggleButtonExpanded: {
    marginTop: -64
  }
})
