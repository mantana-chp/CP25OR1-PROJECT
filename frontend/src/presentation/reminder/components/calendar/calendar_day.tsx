import { IReminder, getCategoryInfo } from '@/src/domain/reminder.domain'
import { IVirtualReminder } from '@/src/utils/recurring_reminder_generator'
import dayjs from 'dayjs'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CalendarDayProps {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  hasEvents?: boolean
  reminderCount?: number
  reminders?: Array<IReminder | IVirtualReminder>
  date: Date
  onPress: (date: Date) => void
  selectedDate: Date | null
  hasVirtualReminders?: boolean
  hasRealReminders?: boolean
}

export default function CalendarDay({
  day,
  isCurrentMonth,
  isToday,
  hasEvents,
  reminderCount,
  reminders = [],
  date,
  onPress,
  selectedDate
}: CalendarDayProps) {
  const displayReminders = reminders.slice(0, 3)

  const isSelected = selectedDate && dayjs(date).isSame(selectedDate, 'day')

  return (
    <TouchableOpacity style={styles.dayCell} onPress={() => onPress(date)}>
      <View style={styles.dayContent}>
        <View
          style={[
            styles.dayNumberContainer,
            isSelected && styles.selectedCell,
            isToday && !isSelected && styles.todayCell
          ]}
        >
          <Text
            style={[
              styles.dayText,
              !isCurrentMonth && styles.inactiveDayText,
              isSelected
                ? styles.selectedText
                : isToday
                  ? styles.todayText
                  : null
            ]}
          >
            {day}
          </Text>
        </View>
        {hasEvents && reminderCount && (
          <View style={styles.eventIndicatorContainer}>
            <View style={styles.dotsContainer}>
              {/* Show dots with category colors */}
              {displayReminders.map((reminder, index) => {
                const color = getCategoryInfo(reminder.categoryName).color

                return (
                  <View
                    key={`${reminder.id}-${index}`}
                    style={[styles.eventDot, { backgroundColor: color }]}
                  />
                )
              })}

              {/* Show "+X" text if more than 3 reminders */}
              {reminderCount && reminderCount > 3 && (
                <Text style={styles.reminderCount}>+{reminderCount - 3}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dayContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2
  },
  dayNumberContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden'
  },
  todayCell: {
  },
  selectedCell: {
    backgroundColor: '#5FA7D1'
  },
  dayText: {
    fontSize: 15,
    color: '#225877',
    fontWeight: '500',
    fontFamily: 'Prompt_500Medium'
  },
  inactiveDayText: {
    color: '#cbd5e1'
  },
  todayText: {
    color: '#FF9F43',
    fontWeight: '700',
    fontFamily: 'Prompt_700Bold'
  },
  selectedText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Prompt_700Bold'
  },
  eventIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  reminderCount: {
    fontSize: 9,
    fontFamily: 'Prompt_500Medium',
    color: '#A6A6A6'
  }
})
