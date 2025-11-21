import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
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
 * - Supports deep linking to specific screens based on notification data
 */
export function usePushNotifications() {
  const router = useRouter()
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

        // Handle deep linking based on notification data
        handleNotificationNavigation(data)
      })

    return () => {
      // Cleanup listeners
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  /**
   * Navigate to appropriate screen based on notification data
   * @param data - The data payload from the notification
   */
  const handleNotificationNavigation = (data: any) => {
    if (!data) return

    // Navigate to reminder details if reminderId is present
    if (data.reminderId) {
      router.push(`/(tabs)/reminder-details/${data.reminderId}`)
    }

    // Navigate to pet profile if petId is present
    else if (data.petId) {
      router.push('/(tabs)/pet_profile')
    }

    // Navigate to calendar/reminders tab by default
    else {
      router.push('/(tabs)')
    }
  }

  return null
}
