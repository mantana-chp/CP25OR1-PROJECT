import { notificationService } from '@/src/utils/api/services/notification_service'
import { useApi } from '@/src/utils/api/use_api'
import React, { useCallback, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Header from '../../components/header_component'
import NotificationList from '../components/notification_list'

export default function InAppNotificationPage() {
  const getNotificationsApi = useApi(notificationService.getNotifications, {
    showErrorAlert: true
  })

  const loadNotifications = useCallback(() => {
    getNotificationsApi.execute()
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const notifications = getNotificationsApi.data?.data || []
  const isLoading = getNotificationsApi.loading

  return (
    <View style={styles.container}>
      <Header title="กล่องแจ้งเตือน" />

      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        onRefresh={loadNotifications}
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
