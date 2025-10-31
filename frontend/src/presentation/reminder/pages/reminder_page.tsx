import React from 'react'
import { View } from 'react-native'
import Calendar from '../components/calendar_component'
import ReminderList from '../components/reminder_list'

export default function ReminderPage() {
  return (
    <View>
      <Calendar />
      <ReminderList />
    </View>
  )
}
