import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { useUnreadNotifications } from '../context/UnreadNotificationContext'
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
  const { refreshUnreadCount } = useUnreadNotifications()
  const responseListener = useRef<Notifications.Subscription | null>(null)
  const notificationListener = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        refreshUnreadCount()
      })

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data

        handleNotificationNavigation(data)
      })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [refreshUnreadCount])

  const handleNotificationNavigation = async (data: any) => {
    if (!data) return

    if (data.notificationId) {
      try {
        await notificationService.updateNotificationStatus(
          data.notificationId,
          { read: true }
        )

        refreshUnreadCount()
      } catch (error) {
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
