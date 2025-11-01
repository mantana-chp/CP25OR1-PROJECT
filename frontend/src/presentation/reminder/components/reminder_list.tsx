import _ from 'lodash'
import React, { useCallback, useEffect, useState } from 'react'

import ReminderCard from '@/src/presentation/reminder/components/reminder_card'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import { Plus } from 'lucide-react-native'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import LoadingComponent from '../../components/loading_component'

type TabType = 'to_do' | 'done'

export default function ReminderList() {
  // ------------------
  // STATE
  // ------------------
  const [activeTab, setActiveTab] = useState<TabType>('to_do')

  // ------------------
  // API
  // ------------------
  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: true
  })

  const deleteReminderApi = useApi(reminderService.deleteReminder, {
    showErrorAlert: true,
    successMessage: 'ลบนัดหมายสำเร็จ',
    onSuccess: () => {
      loadReminders()
    }
  })

  // ------------------
  // LOAD DATA
  // ------------------
  const loadReminders = useCallback(() => {
    console.log('🔄 Loading reminders for tab:', activeTab)
    getRemindersApi.execute({})
  }, [activeTab])

  // Fetch on mount
  useEffect(() => {
    console.log('🎬 Component mounted')
    console.log('🌐 API URL:', process.env.EXPO_PUBLIC_API_BASE_URL)

    const timer = setTimeout(() => {
      loadReminders()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (activeTab) {
      loadReminders()
    }
  }, [activeTab, loadReminders])

  // ------------------
  // DELETE HANDLER
  // ------------------
  const handleDeleteReminder = useCallback(
    (id: string) => {
      Alert.alert(
        'ยืนยันการลบนัดหมาย',
        'คุณแน่ใจหรือไม่ว่าต้องการลบนัดหมายนี้?',
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

  // ------------------
  // DATA
  // ------------------
  const reminders = getRemindersApi.data?.data || []
  const filteredReminders = reminders.filter(
    (reminder) => reminder.reminderStatus === activeTab
  )

  // ------------------
  // RENDER
  // ------------------
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
            นัดหมาย
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
      {getRemindersApi.loading && !getRemindersApi.data ? (
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
                  ? 'ไม่มีนัดหมาย'
                  : 'ไม่มีรายการที่เสร็จสิ้น'}
              </Text>
            </View>
          ) : (
            _.map(filteredReminders, (reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onDelete={handleDeleteReminder}
                isDeleting={deleteReminderApi.loading}
                canDelete={reminder.reminderStatus !== 'done'}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addReminderButton}
        onPress={() => console.log('Add new reminder')}
      >
        <Plus size={32} color="#fff" strokeWidth={3} />
      </TouchableOpacity>
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
