import { Weekday } from '@/src/domain/reminder.domain'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface WeekdaySelectorProps {
  selectedDays: Weekday[]
  onChange: (days: Weekday[]) => void
}

export default function WeekdaySelector({
  selectedDays,
  onChange
}: WeekdaySelectorProps) {
  const weekdays: Weekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ]

  const weekdayShortNames: Record<Weekday, string> = {
    sunday: 'อา',
    monday: 'จ',
    tuesday: 'อ',
    wednesday: 'พ',
    thursday: 'พฤ',
    friday: 'ศ',
    saturday: 'ส'
  }

  const toggleWeekday = (day: Weekday) => {
    if (selectedDays.includes(day)) {
      // Don't allow deselecting the last day
      if (selectedDays.length === 1) return
      onChange(selectedDays.filter((d) => d !== day))
    } else {
      onChange([...selectedDays, day])
    }
  }

  return (
    <View style={styles.container}>
      {weekdays.map((day) => {
        const isSelected = selectedDays.includes(day)
        return (
          <Pressable
            key={day}
            style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
            onPress={() => toggleWeekday(day)}
          >
            <Text
              style={[styles.dayText, isSelected && styles.dayTextSelected]}
            >
              {weekdayShortNames[day]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dayButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  dayButtonSelected: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1'
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#6B7280'
  },
  dayTextSelected: {
    color: '#fff'
  }
})
