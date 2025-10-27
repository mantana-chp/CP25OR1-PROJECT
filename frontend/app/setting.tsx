import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useNotification } from '@/context/NotificationContext'

import { Platform, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Setting() {
  const { expoPushToken, notification, error } = useNotification()

  if (error) {
    console.log(error?.message)

    return <ThemedText>Error: {error?.message}</ThemedText>
  }

  return (
    <ThemedView
      style={{
        flex: 1,
        padding: 10,
        paddingTop: Platform.OS == 'android' ? StatusBar.currentHeight : 10
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedText type="subtitle" style={{ color: 'red' }}>
          Your push token:
        </ThemedText>
        <ThemedText>{expoPushToken}</ThemedText>
        <ThemedText type="subtitle">Latest notification:</ThemedText>
        <ThemedText>{notification?.request.content.title}</ThemedText>
        <ThemedText>
          {JSON.stringify(notification?.request.content.data, null, 2)}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  )
}
