import * as Notifications from 'expo-notifications'

// This needs to be called at the beginning of your app, e.g., inside App.js useEffect
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    alert(
      'Failed to get notification permissions! You will not receive local notifications.'
    )
    return false
  }

  return true
}

// Function to schedule a local notification
export const scheduleLocalNotification = (title: string, body: string) => {
  Notifications.scheduleNotificationAsync({
    content: {
      title,
      body
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1, // Display notification after 1 second
      repeats: false
    }
  })
}

// Set up a listener for notifications received while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
})
