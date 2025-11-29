import { IReminder } from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import dayjs from 'dayjs'
import { Bell, ClockIcon, PawPrintIcon, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import LoadingComponent from './loading_component'

const LAST_SHOWN_KEY = '@today_reminders_last_shown'

interface TodayRemindersModalProps {
  onClose?: () => void
}

export default function TodayRemindersModal({
  onClose
}: TodayRemindersModalProps) {
  const [visible, setVisible] = useState(false)
  const [todayReminders, setTodayReminders] = useState<IReminder[]>([])

  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false
  })

  useEffect(() => {
    checkAndShowModal()
  }, [])

  const checkAndShowModal = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const lastShown = await AsyncStorage.getItem(LAST_SHOWN_KEY)

      // Only show once per day
      if (lastShown === today) {
        return
      }

      // Fetch all reminders
      const response = await getRemindersApi.execute()
      const allReminders = response?.data?.data || []

      // Filter reminders for today (including children)
      const remindersForToday: IReminder[] = []

      allReminders.forEach((reminder) => {
        // Check if main reminder is for today
        const reminderDate = dayjs(reminder.reminderDate).format('YYYY-MM-DD')
        if (reminderDate === today && reminder.reminderStatus !== 'done') {
          remindersForToday.push(reminder)
        }

        // Check children reminders
        if (reminder.children && reminder.children.length > 0) {
          reminder.children.forEach((child) => {
            const childDate = dayjs(child.reminderDate).format('YYYY-MM-DD')
            if (childDate === today && child.reminderStatus !== 'done') {
              remindersForToday.push(child)
            }
          })
        }
      })

      if (remindersForToday.length > 0) {
        setTodayReminders(remindersForToday)
        setVisible(true)
      }
    } catch (error) {
      console.error('Error checking today reminders:', error)
    }
  }

  const handleClose = () => {
    setVisible(false)
    onClose?.()
  }

  const handleMarkAsShown = async () => {
    const today = dayjs().format('YYYY-MM-DD')
    await AsyncStorage.setItem(LAST_SHOWN_KEY, today)
    setVisible(false)
    onClose?.()
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return timeString.substring(0, 5) + ' น.'
  }

  if (!visible || todayReminders.length === 0) {
    return null
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bell size={24} color="#225877" />
              <Text style={styles.headerTitle}>เตือนความจำวันนี้</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={10}>
              <X size={24} color="#6b7280" />
            </Pressable>
          </View>

          {/* Content */}
          {getRemindersApi.loading ? (
            <LoadingComponent />
          ) : (
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.subtitle}>
                คุณมี {todayReminders.length} รายการที่ต้องทำวันนี้
              </Text>

              {todayReminders.map((reminder, index) => (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderHeader}>
                    <Text style={styles.reminderNumber}>{index + 1}.</Text>
                    <View style={styles.reminderContent}>
                      <Text style={styles.reminderName}>
                        {reminder.reminderName}
                      </Text>
                      {reminder.pet_name && (
                        <View style={styles.infoRow}>
                          <PawPrintIcon size={14} color="#2E759E" />
                          <Text style={styles.petName}>
                            {reminder.pet_name}
                          </Text>
                        </View>
                      )}
                      <View style={styles.infoRow}>
                        <ClockIcon size={14} color="#FF9531" />
                        <Text style={styles.reminderTime}>
                          {formatTime(reminder.reminderTime)}
                        </Text>
                      </View>
                      {reminder.description && reminder.description !== '-' && (
                        <Text style={styles.reminderDescription}>
                          {reminder.description}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={styles.acknowledgeButton}
              onPress={handleMarkAsShown}
            >
              <Text style={styles.acknowledgeButtonText}>รับทราบ</Text>
            </Pressable>
            <Pressable style={styles.dismissButton} onPress={handleClose}>
              <Text style={styles.dismissButtonText}>ปิด</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Prompt_700Bold',
    color: '#225877'
  },
  content: {
    padding: 20,
    maxHeight: 400
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center'
  },
  reminderCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5FA7D1'
  },
  reminderHeader: {
    flexDirection: 'row',
    gap: 8
  },
  reminderNumber: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#225877'
  },
  reminderContent: {
    flex: 1,
    gap: 4
  },
  reminderName: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#225877'
  },
  petName: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#2E759E'
  },
  reminderTime: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#FF9531'
  },
  reminderDescription: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    marginTop: 4
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    gap: 12
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  dismissButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#6b7280'
  },
  acknowledgeButton: {
    flex: 1,
    backgroundColor: '#5FA7D1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  acknowledgeButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#fff'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  }
})
