import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Color palette for reminder dots
const REMINDER_COLORS = [
  '#5FA7D1', // Blue
  '#F97316', // Orange
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EF4444' // Red
]

interface CalendarDayProps {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  hasEvents?: boolean
  reminderCount?: number
  date: Date
  onPress: (date: Date) => void
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isCurrentMonth,
  isToday,
  hasEvents,
  reminderCount,
  date,
  onPress
}) => {
  return (
    <TouchableOpacity style={styles.dayCell} onPress={() => onPress(date)}>
      <View style={styles.dayContent}>
        <View style={[styles.dayNumberContainer, isToday && styles.todayCell]}>
          <Text
            style={[
              styles.dayText,
              !isCurrentMonth && styles.inactiveDayText,
              isToday && styles.todayText
            ]}
          >
            {day}
          </Text>
        </View>
        {hasEvents && reminderCount && (
          <View style={styles.eventIndicatorContainer}>
            <View style={styles.dotsContainer}>
              {/* Show up to 3 colored dots */}
              {Array.from({ length: Math.min(3, reminderCount) }).map(
                (_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.eventDot,
                      {
                        backgroundColor:
                          REMINDER_COLORS[index % REMINDER_COLORS.length]
                      }
                    ]}
                  />
                )
              )}

              {/* Show "+X" text if more than 3 reminders */}
              {reminderCount > 3 && (
                <Text style={styles.remainingText}>+{reminderCount - 3}</Text>
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
    alignItems: 'center'
  },
  todayCell: {
    backgroundColor: '#5FA7D1',
    borderRadius: 100,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center'
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
  remainingText: {
    fontSize: 9,
    fontFamily: 'Prompt_500Medium',
    color: '#A6A6A6',
    fontWeight: '600'
  }
})
