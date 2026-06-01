import { IReminder } from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import dayjs from 'dayjs'
import _ from 'lodash'
import { Bell, Check, X } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import ReminderCard from '../reminder/components/reminder_card'
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
  const [isChecked, setIsChecked] = useState(false)

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

      if (lastShown === today) {
        return
      }

      const response = await getRemindersApi.execute()
      const allReminders = response?.data?.data?.reminders || []

      if (!Array.isArray(allReminders)) {
        return
      }

      const remindersForToday: IReminder[] = []

      allReminders.forEach((reminder) => {
        const reminderDate = dayjs(reminder.reminderDate).format('YYYY-MM-DD')
        if (reminderDate === today && reminder.reminderStatus !== 'done') {
          remindersForToday.push(reminder as IReminder)
        }

        if (reminder.children && reminder.children.length > 0) {
          reminder.children.forEach((child) => {
            const childDate = dayjs(child.reminderDate).format('YYYY-MM-DD')
            if (childDate === today && child.reminderStatus !== 'done') {
              remindersForToday.push(child as IReminder)
            }
          })
        }
      })

      if (remindersForToday.length > 0) {
        setTodayReminders(remindersForToday)
        setVisible(true)
      }
    } catch (error) {
    }
  }

  const handleClose = async () => {
    if (isChecked) {
      const today = dayjs().format('YYYY-MM-DD')
      await AsyncStorage.setItem(LAST_SHOWN_KEY, today)
    }
    setVisible(false)
    onClose?.()
  }

  const handleToggleCheckbox = () => {
    setIsChecked(!isChecked)
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
              <Bell size={20} color="#225877" />
              <Text style={styles.headerTitle}>เตือนความจำวันนี้</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={10}>
              <X size={20} color="#6b7280" />
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

              {_.map(todayReminders, (reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  canDelete={false}
                  hideToggle={true}
                />
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={handleToggleCheckbox}
            >
              <View
                style={[
                  styles.checkbox,
                  !isChecked && styles.checkboxUnchecked
                ]}
              >
                {isChecked && (
                  <View style={styles.checkboxInner}>
                    <Check
                      size={14}
                      strokeWidth={3}
                      color="#fff"
                      style={{ alignSelf: 'center' }}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.checkboxText}>ไม่แสดงอีกในวันนี้</Text>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Prompt_700Bold',
    color: '#225877'
  },
  content: {
    padding: 16,
    maxHeight: 400
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center'
  },
  footer: {
    padding: 16,
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
  acknowledgeButton: {
    flex: 1,
    backgroundColor: '#5FA7D1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#5FA7D1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5FA7D1'
  },
  checkboxUnchecked: {
    backgroundColor: '#fff'
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#5FA7D1'
  },
  checkboxText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  }
})
