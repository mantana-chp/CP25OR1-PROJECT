import React from 'react'
<<<<<<< HEAD
import InAppNotification from '@/components/InAppNoti'
import { useInAppNotification } from '@/hooks/useInAppNotification'
import { StyleSheet, Button, Text, View } from 'react-native'

export default function CalendarPage() {
  const { notification, showNotification, hideNotification } =
    useInAppNotification()

  const handlePress = () => {
    showNotification('New message received!')
  }

  return (
    <View style={styles.container}>
      {notification && (
        <InAppNotification
          message={(notification as any)?.message}
          onHide={hideNotification}
        />
      )}
      <Text style={styles.text}>Custom UI Notification Example</Text>
      <Button title="Show Notification Banner" onPress={handlePress} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    fontSize: 18,
    marginBottom: 20
  }
})
=======
import { View } from 'react-native'
import Calendar from '../components/calendar_component'
import ReminderList from '../components/reminder_list'

export default function CalendarPage() {
  return (
    <View>
      <Calendar />
      <ReminderList />
    </View>
  )
}
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc
