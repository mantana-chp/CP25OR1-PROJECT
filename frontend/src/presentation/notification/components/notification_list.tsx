import { useRouter } from 'expo-router'
import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { useUnreadNotifications } from '@/src/context/UnreadNotificationContext'
import { INotification } from '@/src/domain/notification.domain'
import { notificationService } from '@/src/utils/api/services/notification_service'
import { useApi } from '@/src/utils/api/use_api'
import { BellOff } from 'lucide-react-native'
import LoadingComponent from '../../components/loading_component'
import NotificationCard from './notification_card'

interface NotificationListProps {
  notifications: INotification[]
  isLoading?: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
  onMarkAllAsRead?: () => void
  isMarkingAllAsRead?: boolean
}

export default function NotificationList({
  notifications,
  isLoading,
  isRefreshing = false,
  onRefresh,
  onMarkAllAsRead,
  isMarkingAllAsRead = false
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
    },
    onSuccess: (updatedNotification) => {
      if (onRefresh) {
        onRefresh()
      }
      refreshUnreadCount()
    }
  })

  const handleCardPress = useCallback(
    (notification: INotification) => {
      if (!notification.readAt && !readIds.includes(notification.id)) {
        setReadIds((prev) => [...prev, notification.id])

        markAsReadApi.execute(notification.id, { read: true })
      }

      if (notification.reminderId) {
        router.push({
          pathname: '/(tabs)',
          params: { reminderId: notification.reminderId }
        })
      }
    },
    [router, readIds, markAsReadApi]
  )

  const unreadCount = notifications.filter(
    (notification) => !notification.readAt && !readIds.includes(notification.id)
  ).length

  return (
    <View style={styles.container}>
      {isLoading ? (
        <LoadingComponent />
      ) : (
        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => onRefresh?.()}
              colors={['#FF8A65']}
              tintColor="#FF8A65"
            />
          }
        >
          {_.size(notifications) > 0 && (
            <View style={styles.actionRow}>
              <Text style={styles.actionHintText}>
                ยังไม่ได้อ่าน {unreadCount} รายการ
              </Text>
              <Pressable
                onPress={onMarkAllAsRead}
                disabled={isMarkingAllAsRead || unreadCount === 0}
              >
                <Text
                  style={[
                    styles.readAllText,
                    (isMarkingAllAsRead || unreadCount === 0) &&
                      styles.readAllTextDisabled
                  ]}
                >
                  {isMarkingAllAsRead ? 'กำลังอัปเดต...' : 'อ่านทั้งหมด'}
                </Text>
              </Pressable>
            </View>
          )}

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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  actionHintText: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'Prompt_400Regular'
  },
  readAllText: {
    color: '#2E759E',
    fontSize: 14,
    fontFamily: 'Prompt_500Medium'
  },
  readAllTextDisabled: {
    color: '#C4C4C4'
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
