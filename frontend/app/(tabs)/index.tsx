 
import React from 'react'
import CalendarPage from '@/presentation/calendar/pages/calendar_page'
import { ThemedView } from '@/components/themed-view'
import { Platform, StatusBar } from 'react-native'

export default function CalendarTab() {
  return (
    <ThemedView
          style={{
            flex: 1,
            padding: 10,
            paddingTop: Platform.OS == 'android' ? StatusBar.currentHeight : 10
          }}
        >
    <CalendarPage /></ThemedView>
  )
}
