import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { notificationService } from '../utils/api/services/notification_service'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
})

export function usePushNotifications() {
  const router = useRouter()
  const responseListener = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    // Listen for user tapping on notifications
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data

        handleNotificationNavigation(data)
      })

    return () => {
      // Cleanup listeners
      responseListener.current?.remove()
    }
  }, [])

  const handleNotificationNavigation = async (data: any) => {
    if (!data) return

    // Mark notification as read if notificationId is present
    if (data.notificationId) {
      try {
        await notificationService.updateNotificationStatus(
          data.notificationId,
          { read: true }
        )
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    if (data.reminderId) {
      router.push({
        pathname: '/(tabs)',
        params: { reminderId: data.reminderId }
      })
    } else if (data.petId) {
      router.push('/(tabs)/pet_profile')
    } else {
      router.push('/(tabs)')
    }
  }

  return null
}
