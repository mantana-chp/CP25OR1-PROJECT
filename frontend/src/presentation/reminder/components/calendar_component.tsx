import _ from 'lodash'
import React, { useRef, useState } from 'react'

import { thaiMonths, weekDays } from '@/src/domain/calendar.domain'
import { IReminder } from '@/src/domain/reminder.domain'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native'
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

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

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
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current

  // Animate chevron rotation
  React.useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start()
  }, [isExpanded])

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg']
  })

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

  const previousMonth = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

  const goToToday = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setCurrentDate(new Date())
  }

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onToggle()
  }

  // Check if a date has reminders
  const hasReminders = (date: Date) => {
    return reminders.some((reminder) => {
      const reminderDate = new Date(reminder.reminderDate)
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      )
    })
  }

  // Get reminder count for a specific date
  const getReminderCount = (date: Date) => {
    return reminders.filter((reminder) => {
      const reminderDate = new Date(reminder.reminderDate)
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      )
    }).length
  }

  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear()

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

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
      const isToday =
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()

      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        hasEvents: hasReminders(
          new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        ),
        reminderCount: getReminderCount(
          new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        ),
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      })
    }

    return days
  }

  const getCurrentWeekDays = () => {
    const allDays = renderCalendar()
    const todayIndex = allDays.findIndex((d) => d.isToday)

    if (todayIndex === -1) {
      return allDays.slice(0, 7)
    }

    const rowIndex = Math.floor(todayIndex / 7)
    const startIndex = rowIndex * 7

    return allDays.slice(startIndex, startIndex + 7)
  }

  const days = isExpanded ? renderCalendar() : getCurrentWeekDays()

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {thaiMonths[currentDate.getMonth()].name_th}{' '}
          {currentDate.getFullYear() + 543}
        </Text>
        <View style={styles.navigation}>
          {/* Today Button */}
          {!isCurrentMonth && (
            <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>วันนี้</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
            <ChevronLeft size={20} color="#225877" />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <ChevronRight size={20} color="#225877" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Week days */}
      <View style={styles.weekDaysRow}>
        {_.map(weekDays, (day, index) => (
          <View key={index} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {_.map(days, (item, index) => (
          <TouchableOpacity
            key={`${item.date.getTime()}-${index}`}
            style={[styles.dayCell, item.isToday && styles.todayCell]}
            onPress={() => console.log('Selected date:', item.date)}
          >
            <Text
              style={[
                styles.dayText,
                !item.isCurrentMonth && styles.inactiveDayText,
                item.isToday && styles.todayText
              ]}
            >
              {item.day}
            </Text>
            {item.hasEvents && item.reminderCount && (
              <View style={styles.eventIndicatorContainer}>
                <View style={styles.dotsContainer}>
                  {Array.from({ length: Math.min(3, item.reminderCount) }).map(
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

                  {item.reminderCount > 3 && (
                    <Text style={styles.remainingText}>
                      +{item.reminderCount - 3}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Toggle Button */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold'
  },
  navigation: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#5FA7D1',
    marginRight: 4
  },
  todayButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Prompt_400Regular'
  },
  navButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f9ff'
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Prompt_400Regular'
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  todayCell: {
    backgroundColor: '#5FA7D1',
    borderRadius: 100
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
    position: 'absolute',
    bottom: -5,
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
