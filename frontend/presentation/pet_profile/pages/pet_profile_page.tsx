import React from 'react'
import {
  requestNotificationPermissions,
  scheduleLocalNotification
} from '@/context/InAppNotificationManager'
import { useEffect } from 'react'
import { Button, Text, View } from 'react-native'

export default function PetProfilePage() {
  useEffect(() => {
    requestNotificationPermissions()
  }, [])

  const handlePress = () => {
    scheduleLocalNotification(
      'New Notification',
      'This is a test notification!'
    )
  }

  return (
    <View>
      <Text>Local Notification Example</Text>
      <Button title="Show Notification" onPress={handlePress} />
    </View>
  )
}
