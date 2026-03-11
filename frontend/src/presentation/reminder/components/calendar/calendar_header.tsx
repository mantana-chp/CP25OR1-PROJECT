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
  canGoPrev?: boolean
  canGoNext?: boolean
  onLimitReached?: (direction: 'prev' | 'next') => void
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
  canGoPrev = true,
  canGoNext = true,
  onLimitReached
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

  const handlePrevPress = () => {
    if (!canGoPrev) {
      onLimitReached?.('prev')
      return
    }
    onPreviousMonth()
  }

  const handleNextPress = () => {
    if (!canGoNext) {
      onLimitReached?.('next')
      return
    }
    onNextMonth()
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
            <RotateCcw size={16} color="#225877" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handlePrevPress}
          style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
        >
          <ChevronLeft size={20} color={canGoPrev ? '#225877' : '#b0c4d8'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNextPress}
          style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
        >
          <ChevronRight size={20} color={canGoNext ? '#225877' : '#b0c4d8'} />
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
    fontSize: 17,
    fontFamily: 'Prompt_500Medium'
  },
  navigation: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  resetButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
    marginRight: 4
  },
  navButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f9ff'
  },
  navButtonDisabled: {
    backgroundColor: '#f8fafc'
  }
})
