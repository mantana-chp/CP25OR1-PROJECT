import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'

// Configure how notifications should be displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
})

/**
 * Hook to handle push notifications
 * - Listens for notifications while app is running
 * - Handles notification tap events
 */
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.Subscription | null>(null)
  const responseListener = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('🔔 Notification received:', notification)
        // You can add custom handling here, like updating app state
      })

    // Listen for user tapping on notifications
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('👆 Notification tapped:', response)

        // Extract data from notification
        const data = response.notification.request.content.data
        console.log('Notification data:', data)

        // You can navigate to specific screens based on notification data
        // Example: if (data.reminderId) { router.push(`/reminder-details/${data.reminderId}`) }
      })

    return () => {
      // Cleanup listeners
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  return null
}
