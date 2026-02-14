import { thaiMonths } from '@/src/domain/calendar.domain'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CalendarHeaderProps {
  currentDate: Date
  onPreviousMonth: () => void
  onNextMonth: () => void
  onReset: () => void
  showReset: boolean
  onResetFilters?: () => void
  isPetFilterActive?: boolean
  isCategoryFilterActive?: boolean
}

export default function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onReset,
  showReset,
  onResetFilters,
  isPetFilterActive = false,
  isCategoryFilterActive = false,
}: CalendarHeaderProps) {
  const shouldShowReset =
    showReset || isPetFilterActive || isCategoryFilterActive

  const handleResetPress = () => {
    // Reset calendar filter
    onReset()
    // Reset reminder filters if callback provided
    if (onResetFilters) {
      onResetFilters()
    }
  }
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>
        {thaiMonths[currentDate.getMonth()].name_th}{' '}
        {currentDate.getFullYear() + 543}
      </Text>
      <View style={styles.navigation}>
        {shouldShowReset && (
          <TouchableOpacity
            onPress={handleResetPress}
            style={styles.resetButton}
          >
            <RotateCcw size={16} color='#225877' />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onPreviousMonth} style={styles.navButton}>
          <ChevronLeft size={20} color='#225877' />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNextMonth} style={styles.navButton}>
          <ChevronRight size={20} color='#225877' />
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
    marginBottom: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Prompt_700Bold',
  },
  navigation: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  resetButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
    marginRight: 4,
  },
  navButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
})
