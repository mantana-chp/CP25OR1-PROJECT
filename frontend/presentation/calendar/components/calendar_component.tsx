import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()

  const thaiMonths = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม'
  ]

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

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
        isToday: false
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
        // You can add event data here
        hasEvents: day === 8 || day === 30 // Example
      })
    }

    return days
  }

  const days = renderCalendar()

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText} className="font-prompt">
          {thaiMonths[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
        </Text>
        <View style={styles.navigation}>
          <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <ChevronRight size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Week days */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {days.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dayCell, item.isToday && styles.todayCell]}
            onPress={() => console.log('Selected date:', item.day)}
          >
            <Text
              style={[
                styles.dayText,
                !item.isCurrentMonth && styles.inactiveDayText,
                item.isToday && styles.todayText
              ]}
              className="font-prompt"
            >
              {item.day}
            </Text>
            {/* Event indicators - customize based on your data */}
            {item.hasEvents && (
              <View style={styles.eventIndicators}>
                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                <View style={[styles.dot, { backgroundColor: '#ec4899' }]} />
                {item.day === 8 && (
                  <Text style={styles.plusText} className="font-prompt">
                    +1
                  </Text>
                )}
              </View>
            )}
            {item.day === 30 && (
              <View style={styles.eventIndicators}>
                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                <View style={[styles.dot, { backgroundColor: '#ec4899' }]} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000'
  },
  navigation: {
    flexDirection: 'row',
    gap: 8
  },
  navButton: {
    padding: 8
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000'
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
    paddingVertical: 8,
    position: 'relative'
  },
  todayCell: {
    backgroundColor: '#dbeafe',
    borderRadius: 50
  },
  dayText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500'
  },
  inactiveDayText: {
    color: '#9ca3af'
  },
  todayText: {
    fontWeight: '700'
  },
  eventIndicators: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    gap: 3,
    alignItems: 'center'
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  plusText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2
  }
})
