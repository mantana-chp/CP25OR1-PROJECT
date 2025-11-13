import { thaiMonths } from '@/src/domain/calendar.domain'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CalendarHeaderProps {
  currentDate: Date
  isCurrentMonth: boolean
  onPreviousMonth: () => void
  onNextMonth: () => void
  onGoToToday: () => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  onGoToToday
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>
        {thaiMonths[currentDate.getMonth()].name_th}{' '}
        {currentDate.getFullYear() + 543}
      </Text>
      <View style={styles.navigation}>
        {/* Today Button */}
        {!isCurrentMonth && (
          <TouchableOpacity onPress={onGoToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>วันนี้</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onPreviousMonth} style={styles.navButton}>
          <ChevronLeft size={20} color="#225877" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNextMonth} style={styles.navButton}>
          <ChevronRight size={20} color="#225877" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
  }
})
