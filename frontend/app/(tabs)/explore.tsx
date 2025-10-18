import {
  requestNotificationPermissions,
  scheduleLocalNotification
} from '@/context/InAppNotificationManager'
import React, { useEffect } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'

export default function TabTwoScreen() {
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
    <View style={styles.container}>
      <Text style={styles.text}>Local Notification Example</Text>
      <Button title="Show Notification" onPress={handlePress} />
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

// export default function TabTwoScreen() {
//   const { expoPushToken, notification, error } = useNotification()

//   if (error) {
//     console.log(error?.message)

//     return <ThemedText>Error: {error?.message}</ThemedText>
//   }

//   return (
//     <ThemedView
//       style={{
//         flex: 1,
//         padding: 10,
//         paddingTop: Platform.OS == 'android' ? StatusBar.currentHeight : 10
//       }}
//     >
//       <SafeAreaView style={{ flex: 1 }}>
//         <ThemedText type="subtitle" style={{ color: 'red' }}>
//           Your push token:
//         </ThemedText>
//         <ThemedText>{expoPushToken}</ThemedText>
//         <ThemedText type="subtitle">Latest notification:</ThemedText>
//         <ThemedText>{notification?.request.content.title}</ThemedText>
//         <ThemedText>
//           {JSON.stringify(notification?.request.content.data, null, 2)}
//         </ThemedText>
//       </SafeAreaView>
//     </ThemedView>
//   )
// }
