import { weekDays } from '@/src/domain/calendar.domain'
import _ from 'lodash'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export const WeekDaysRow: React.FC = () => {
  return (
    <View style={styles.weekDaysRow}>
      {_.map(weekDays, (day, index) => (
        <View key={index} style={styles.weekDayCell}>
          <Text style={styles.weekDayText}>{day}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
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
  }
})
