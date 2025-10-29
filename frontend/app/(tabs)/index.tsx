import { ThemedView } from '@/components/themed-view'
import CalendarPage from '@/presentation/calendar/pages/calendar_page'
import React from 'react'
import { StatusBar } from 'react-native'

export default function CalendarTab() {
  return (
    <ThemedView
      style={{
        flex: 1,
        padding: 10,
        paddingTop: StatusBar.currentHeight
      }}
    >
      <CalendarPage />
    </ThemedView>
  )
}
