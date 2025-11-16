import { INotification } from '@/src/domain/notification.domain'
import { useRouter } from 'expo-router'
import _ from 'lodash'
import React, { useCallback, useState, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import LoadingComponent from '../../components/loading_component'
import NotificationCard from './notification_card'
import { notificationService } from '@/src/utils/api/services/notification_service'
import { useApi } from '@/src/utils/api/use_api'

interface NotificationListProps {
  notifications: INotification[]
  isLoading?: boolean
  onRefresh?: () => void // Kept for future pull-to-refresh
}

export default function NotificationList({
  notifications,
  isLoading,
  onRefresh,
}: NotificationListProps) {
  const router = useRouter()

  // This state holds IDs of notifications we've marked as read *during this session*
  // for an instant UI update.
  const [readIds, setReadIds] = useState<string[]>([])

  // Reset local state if the main list is refreshed
  useEffect(() => {
    setReadIds([])
  }, [notifications])

  // Create an API hook for updating the status
  const markAsReadApi = useApi(notificationService.updateNotificationStatus, {
    showErrorAlert: true,
    onError: (error) => {
      // If the API call fails, remove the ID from the local state
      // so the card reverts to 'unread'
      console.error('Failed to mark as read:', error)
      // This part is tricky; we'd need to know which ID failed.
      // For now, we'll rely on the onRefresh to fix it.
    },
    onSuccess: (updatedNotification) => {
      // When successful, officially call onRefresh to get the
      // latest data from the server.
      if (onRefresh) {
        onRefresh()
      }
    },
  })

  //   // Example: Handle press, e.g., navigate to reminder details
  //   const handleCardPress = useCallback(
  //     (notification: INotification) => {
  //       console.log('Navigating to reminder:', notification.reminder_id)
  //       router.push(`/(tabs)/reminder-details/${notification.reminder_id}`)
  //     },
  //     [router]
  //   )

  // Example: Mark as read when pressed
  // const handleCardPress = useCallback(async (notification: INotification) => {
  //   if (notification.status === 'sent') {
  //     try {
  //       await notificationService.updateNotificationStatus(notification.id, {
  //         status: 'read',
  //       })
  //       if (onRefresh) onRefresh()
  //     } catch (error) {
  //       console.error('Failed to mark as read', error)
  //     }
  //   }
  //   router.push(`/(tabs)/reminder-details/${notification.reminder_id}`)
  // }, [router, onRefresh])

  const handleCardPress = useCallback(
    (notification: INotification) => {
      // Only call the API if it's not already read (read_at is null)
      // AND we haven't already tried to mark it as read (not in readIds)
      if (!notification.read_at && !readIds.includes(notification.id)) {
        console.log('Marking as read:', notification.id)

        // 1. Instantly update UI by adding to local state
        setReadIds((prev) => [...prev, notification.id])

        // 2. Call the API in the background
        markAsReadApi.execute(notification.id, { read: true })
      }

      // 3. Navigate immediately
      router.push(`/(tabs)/reminder-details/${notification.reminder_id}`)
    },
    [router, readIds, markAsReadApi]
  )

  return (
    <View style={styles.container}>
      {isLoading ? (
        <LoadingComponent />
      ) : (
        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {_.size(notifications) === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่มีการแจ้งเตือน</Text>
            </View>
          ) : (
            _.map(notifications, (notification) => {
              const isRead =
                !!notification.read_at || readIds.includes(notification.id)

              return (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onPress={handleCardPress}
                  isRead={isRead}
                />
              )
            })
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#C4C4C4',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
  },
})
