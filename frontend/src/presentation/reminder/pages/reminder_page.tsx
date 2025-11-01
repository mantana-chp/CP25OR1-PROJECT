import React from 'react'
import { View } from 'react-native'
import Calendar from '../components/calendar_component'
import ReminderList from '../components/reminder_list'

export default function ReminderPage() {
  return (
    <View style={{ flex: 1 }}>
      {/* Calendar takes fixed space */}
      <Calendar />

      {/* ReminderList takes remaining space */}
      <View style={{ flex: 1 }}>
        <ReminderList />
      </View>
    </View>
  )
}
