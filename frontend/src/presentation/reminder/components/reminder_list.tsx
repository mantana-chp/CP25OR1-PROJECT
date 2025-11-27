import { Link, useRouter } from 'expo-router'
import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'

import { IReminder } from '@/src/domain/reminder.domain'
import ReminderCard from '@/src/presentation/reminder/components/reminder_card'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'

import { Plus } from 'lucide-react-native'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import LoadingComponent from '../../components/loading_component'
import ReminderDetailModal from '../pages/reminder_detail_modal'

type TabType = 'to_do' | 'done'

interface ReminderListProps {
  reminders: IReminder[]
  isLoading?: boolean
  onRefresh?: () => void
  initialReminderId?: string | null
}

export default function ReminderList({
  reminders,
  isLoading,
  onRefresh,
  initialReminderId
}: ReminderListProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('to_do')

  const [tempDoneIds, setTempDoneIds] = useState<string[]>([])
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    initialReminderId || null
  )

  const deleteReminderApi = useApi(reminderService.deleteReminder, {
    showErrorAlert: true,
    successMessage: 'ลบนัดเตือนความจำสำเร็จ',
    onSuccess: () => {
      if (onRefresh) {
        onRefresh()
      }
    }
  })

  const updateStatusApi = useApi(reminderService.updateReminderStatus, {
    showErrorAlert: true
  })

  useEffect(() => {
    setTempDoneIds([])
  }, [reminders])

  useEffect(() => {
    if (initialReminderId) {
      setSelectedReminderId(initialReminderId)
    }
  }, [initialReminderId])

  const handleReminderDetail = (reminderId: string) => {
    setSelectedReminderId(reminderId)
  }

  const handleDeleteReminder = useCallback(
    (id: string) => {
      Alert.alert(
        'ยืนยันการลบเตือนความจำ',
        'คุณแน่ใจหรือไม่ว่าต้องการลบเตือนความจำนี้?',
        [
          {
            text: 'ยกเลิก',
            style: 'cancel'
          },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: () => {
              console.log('🗑️ Deleting reminder:', id)
              deleteReminderApi.execute(id)
            }
          }
        ]
      )
    },
    [deleteReminderApi]
  )

  const handleToggleStatus = useCallback(
    async (id: string, currentStatus: string) => {
      if (tempDoneIds.includes(id)) return

      // Optimistic UI update for to_do/overdue -> done
      if (currentStatus === 'to_do' || currentStatus === 'overdue') {
        setTempDoneIds((prev) => [...prev, id])
      }

      try {
        await updateStatusApi.execute(id)

        setTimeout(() => {
          if (onRefresh) {
            onRefresh()
          }
        }, 200)
      } catch (error) {
        console.error('Failed to update status', error)
        if (currentStatus === 'to_do' || currentStatus === 'overdue') {
          setTempDoneIds((prev) => prev.filter((doneId) => doneId !== id))
        }
      }
    },
    [tempDoneIds, updateStatusApi, onRefresh]
  )

  const filteredReminders = reminders.filter((reminder) => {
    if (activeTab === 'to_do') {
      return (
        reminder.reminderStatus === 'to_do' ||
        reminder.reminderStatus === 'overdue'
      )
    } else {
      return reminder.reminderStatus === activeTab
    }
  })

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('to_do')}
          style={[styles.tabButton, { alignItems: 'center' }]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'to_do' && styles.activeTabText
            ]}
          >
            เตือนความจำ
          </Text>
          {activeTab === 'to_do' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('done')}
          style={styles.tabButton}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'done' && styles.activeTabText
            ]}
          >
            เสร็จสิ้น
          </Text>
          {activeTab === 'done' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>
      </View>

      {/* Reminder Content */}
      {isLoading ? (
        <LoadingComponent />
      ) : (
        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {_.size(filteredReminders) === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'to_do'
                  ? 'ไม่มีเตือนความจำ'
                  : 'ไม่มีรายการที่เสร็จสิ้น'}
              </Text>
            </View>
          ) : (
            _.map(filteredReminders, (reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onDelete={handleDeleteReminder}
                onPress={handleReminderDetail}
                isDeleting={deleteReminderApi.loading}
                canDelete={reminder.reminderStatus !== 'done'}
                onToggleStatus={handleToggleStatus}
                isTempDone={tempDoneIds.includes(reminder.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <Link href="/(tabs)/add-reminder" push asChild>
        <TouchableOpacity style={styles.addReminderButton}>
          <Plus size={32} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      </Link>

      {/* Reminder Detail Modal */}
      <Modal
        visible={!!selectedReminderId}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReminderId(null)}
      >
        <ReminderDetailModal
          id={selectedReminderId || ''}
          onClose={() => setSelectedReminderId(null)}
        />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff9f1',
    borderRadius: 24
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f1'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f1'
  },
  errorText: {
    fontSize: 16,
    color: '#BF1737',
    fontFamily: 'Prompt_400Regular'
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff9f1'
  },
  tabButton: {
    paddingBottom: 8
  },
  tabText: {
    color: '#C4C4C4',
    fontSize: 20,
    fontFamily: 'Prompt_400Regular'
  },
  activeTabText: {
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#225877'
  },
  contentContainer: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: '#C4C4C4',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular'
  },
  addReminderButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5FA7D1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible'
  }
})
