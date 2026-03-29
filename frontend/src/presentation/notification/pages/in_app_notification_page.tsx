import { useUnreadNotifications } from '@/src/context/UnreadNotificationContext'
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh'
import { notificationService } from '@/src/utils/api/services/notification_service'
import { useApi } from '@/src/utils/api/use_api'
import { useFocusEffect } from 'expo-router'
import React, { useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import Header from '../../components/header_component'
import NotificationList from '../components/notification_list'

export default function InAppNotificationPage() {
  const { refreshUnreadCount } = useUnreadNotifications()
  const getNotificationsApi = useApi(notificationService.getNotifications, {
    showErrorAlert: true
  })

  const loadNotifications = useCallback(() => {
    return getNotificationsApi.execute()
  }, [getNotificationsApi.execute])

  const { isRefreshing, onRefresh } = usePullToRefresh(loadNotifications)

  useFocusEffect(
    useCallback(() => {
      loadNotifications()
    }, [loadNotifications])
  )

  // Refresh unread count when page comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount()
    }, [refreshUnreadCount])
  )

  const notifications = getNotificationsApi.data?.data || []
  const isLoading = getNotificationsApi.loading

  return (
    <View style={styles.container}>
      <Header title="กล่องแจ้งเตือน" />

      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  }
})
