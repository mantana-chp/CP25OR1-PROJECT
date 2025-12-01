import { useUnreadNotifications } from '@/src/context/UnreadNotificationContext'
import { INotification } from '@/src/domain/notification.domain'
import { notificationService } from '@/src/utils/api/services/notification_service'
import { useApi } from '@/src/utils/api/use_api'
import { useRouter } from 'expo-router'
import _ from 'lodash'
import { BellOff } from 'lucide-react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import LoadingComponent from '../../components/loading_component'
import NotificationCard from './notification_card'

interface NotificationListProps {
  notifications: INotification[]
  isLoading?: boolean
  onRefresh?: () => void
}

export default function NotificationList({
  notifications,
  isLoading,
  onRefresh
}: NotificationListProps) {
  const router = useRouter()
  const { refreshUnreadCount } = useUnreadNotifications()
  const [readIds, setReadIds] = useState<string[]>([])

  useEffect(() => {
    setReadIds([])
  }, [notifications])

  const markAsReadApi = useApi(notificationService.updateNotificationStatus, {
    showErrorAlert: true,
    onError: (error) => {
      console.error('Failed to mark as read:', error)
    },
    onSuccess: (updatedNotification) => {
      console.log('Success to mark as read!!!!')

      if (onRefresh) {
        onRefresh()
      }
      // Refresh unread count after marking as read
      refreshUnreadCount()
    }
  })

  const handleCardPress = useCallback(
    (notification: INotification) => {
      if (!notification.readAt && !readIds.includes(notification.id)) {
        setReadIds((prev) => [...prev, notification.id])

        markAsReadApi.execute(notification.id, { read: true })
      }

      router.push({
        pathname: '/(tabs)',
        params: { reminderId: notification.reminderId }
      })
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
              <BellOff size={56} color="#C4C4C4" strokeWidth={1.5} />
              <Text style={styles.emptyText}>ไม่มีการแจ้งเตือน</Text>
            </View>
          ) : (
            _.map(notifications, (notification) => {
              const isRead =
                !!notification.readAt || readIds.includes(notification.id)

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
    width: '100%'
  },
  contentContainer: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  emptyText: {
    color: '#C4C4C4',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular'
  }
})
