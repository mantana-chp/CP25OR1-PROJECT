import { IReminder } from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import dayjs from 'dayjs'
import { AlertCircle, Bell, Check, Clock, PawPrint } from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

const SHOWN_REMINDERS_KEY = '@realtime_shown_reminders'
const CHECK_INTERVAL = 30000 // Check every 30 seconds

interface RealtimeReminderNotificationProps {
  onReminderShown?: (reminder: IReminder) => void
  onReminderCompleted?: (reminderId: string) => void
}

export default function RealtimeReminderNotification({
  onReminderShown,
  onReminderCompleted
}: RealtimeReminderNotificationProps) {
  const [visible, setVisible] = useState(false)
  const [currentReminder, setCurrentReminder] = useState<IReminder | null>(null)
  const [shownReminderIds, setShownReminderIds] = useState<Set<string>>(
    new Set()
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideAnim = useRef(new Animated.Value(0)).current
  const [isMarkingDone, setIsMarkingDone] = useState(false)

  const getRemindersApi = useApi(reminderService.getReminders, {
    showErrorAlert: false
  })

  const updateStatusApi = useApi(reminderService.updateReminderStatus, {
    showErrorAlert: false
  })

  // Load previously shown reminders from storage
  useEffect(() => {
    loadShownReminders()
    startChecking()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const loadShownReminders = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const stored = await AsyncStorage.getItem(
        `${SHOWN_REMINDERS_KEY}_${today}`
      )
      if (stored) {
        const ids = JSON.parse(stored)
        setShownReminderIds(new Set(ids))
      } else {
        // Clear old data from previous days
        await clearOldShownReminders()
      }
    } catch (error) {
      console.error('Error loading shown reminders:', error)
    }
  }

  const clearOldShownReminders = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const oldKeys = keys.filter(
        (key) =>
          key.startsWith(SHOWN_REMINDERS_KEY) &&
          !key.endsWith(dayjs().format('YYYY-MM-DD'))
      )
      if (oldKeys.length > 0) {
        await AsyncStorage.multiRemove(oldKeys)
      }
    } catch (error) {
      console.error('Error clearing old shown reminders:', error)
    }
  }

  const saveShownReminder = async (reminderId: string) => {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const newSet = new Set([...shownReminderIds, reminderId])
      setShownReminderIds(newSet)
      await AsyncStorage.setItem(
        `${SHOWN_REMINDERS_KEY}_${today}`,
        JSON.stringify([...newSet])
      )
    } catch (error) {
      console.error('Error saving shown reminder:', error)
    }
  }

  const startChecking = () => {
    // Check immediately
    checkForDueReminders()

    // Then check every 30 seconds
    intervalRef.current = setInterval(() => {
      checkForDueReminders()
    }, CHECK_INTERVAL)
  }

  const checkForDueReminders = async () => {
    try {
      // Don't check if modal is already visible
      if (visible) return

      const response = await getRemindersApi.execute()
      const allReminders = response?.data?.data?.reminders || []

      if (!Array.isArray(allReminders)) {
        return
      }

      const now = dayjs()
      const currentDate = now.format('YYYY-MM-DD')
      const currentTime = now.format('HH:mm')

      // Find reminders that are due right now (within the last 5 minutes)
      const dueReminders: IReminder[] = []

      allReminders.forEach((reminder: any) => {
        if (shouldShowReminder(reminder, currentDate, currentTime)) {
          dueReminders.push(reminder)
        }

        // Check child reminders (vaccine doses)
        if (reminder.children && reminder.children.length > 0) {
          reminder.children.forEach((child: any) => {
            if (shouldShowReminder(child, currentDate, currentTime)) {
              dueReminders.push(child)
            }
          })
        }
      })

      // Show the first due reminder that hasn't been shown yet
      if (dueReminders.length > 0) {
        const reminderToShow = dueReminders.find(
          (r) => !shownReminderIds.has(r.id)
        )
        if (reminderToShow) {
          showNotification(reminderToShow)
        }
      }
    } catch (error) {
      console.error('Error checking for due reminders:', error)
    }
  }

  const shouldShowReminder = (
    reminder: any,
    currentDate: string,
    currentTime: string
  ): boolean => {
    // Skip if already done or shown
    if (
      reminder.reminderStatus === 'done' ||
      shownReminderIds.has(reminder.id)
    ) {
      return false
    }

    const reminderDate = dayjs(reminder.reminderDate).format('YYYY-MM-DD')
    const reminderTime = reminder.reminderTime
      ? reminder.reminderTime.substring(0, 5)
      : null

    // Must be today
    if (reminderDate !== currentDate) {
      return false
    }

    // If no time specified, don't show real-time notification
    if (!reminderTime) {
      return false
    }

    // Check if reminder time is now or within the last 5 minutes
    const reminderDateTime = dayjs(`${reminderDate} ${reminderTime}`)
    const now = dayjs()
    const minutesDiff = now.diff(reminderDateTime, 'minute')

    // Show if it's within 5 minutes past the reminder time (including overdue)
    // -1 minute means we show it up to 1 minute before the scheduled time
    return minutesDiff >= -1 && minutesDiff <= 5
  }

  const showNotification = (reminder: IReminder) => {
    setCurrentReminder(reminder)
    setVisible(true)
    saveShownReminder(reminder.id)
    onReminderShown?.(reminder)

    // Animate slide in
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start()
  }

  const handleAcknowledge = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setVisible(false)
      setCurrentReminder(null)
      slideAnim.setValue(0)
    })
  }

  const handleMarkDone = async () => {
    if (!currentReminder || isMarkingDone) return

    try {
      setIsMarkingDone(true)
      await updateStatusApi.execute(currentReminder.id)

      Alert.alert('สำเร็จ', 'ทำเครื่องหมายเสร็จเรียบร้อยแล้ว', [
        {
          text: 'ตกลง',
          onPress: () => {
            onReminderCompleted?.(currentReminder.id)
            handleAcknowledge()
          }
        }
      ])
    } catch (error) {
      console.error('Error marking reminder as done:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถทำเครื่องหมายเสร็จได้')
    } finally {
      setIsMarkingDone(false)
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return timeString.substring(0, 5) + ' น.'
  }

  const getStatusText = (reminder: IReminder) => {
    if (reminder.reminderStatus === 'overdue') {
      return 'เกินกำหนดเวลาแล้ว'
    }
    return 'ถึงเวลาแล้ว'
  }

  const getStatusColor = (reminder: IReminder) => {
    if (reminder.reminderStatus === 'overdue') {
      return '#BF1737'
    }
    return '#F59E0B'
  }

  if (!visible || !currentReminder) {
    return null
  }

  const isOverdue = currentReminder.reminderStatus === 'overdue'
  const statusColor = getStatusColor(currentReminder)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleAcknowledge}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            isOverdue && styles.modalContainerOverdue,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-300, 0]
                  })
                },
                {
                  scale: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }
              ],
              opacity: slideAnim
            }
          ]}
        >
          {/* Header with Icon */}
          <View style={[styles.header, { borderBottomColor: statusColor }]}>
            <View style={[styles.iconCircle, { backgroundColor: statusColor }]}>
              {isOverdue ? (
                <AlertCircle size={28} color="#fff" />
              ) : (
                <Bell size={28} color="#fff" />
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(currentReminder)}
              </Text>
              <Text style={styles.headerTitle}>เตือนความจำ</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.reminderTitle}>
              {currentReminder.reminderName}
            </Text>

            {currentReminder.pet_name && (
              <View style={styles.infoRow}>
                <PawPrint size={16} color="#2E759E" />
                <Text style={styles.infoText}>{currentReminder.pet_name}</Text>
              </View>
            )}

            {currentReminder.reminderTime && (
              <View style={styles.infoRow}>
                <Clock size={16} color={statusColor} />
                <Text style={[styles.infoText, { color: statusColor }]}>
                  {formatTime(currentReminder.reminderTime)}
                </Text>
              </View>
            )}

            {currentReminder.description &&
              currentReminder.description !== '-' && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>รายละเอียด:</Text>
                  <Text style={styles.descriptionText}>
                    {currentReminder.description}
                  </Text>
                </View>
              )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.acknowledgeButton]}
              onPress={handleAcknowledge}
              activeOpacity={0.7}
              disabled={isMarkingDone}
            >
              <Text style={styles.acknowledgeButtonText}>เข้าใจแล้ว</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.doneButton]}
              onPress={handleMarkDone}
              activeOpacity={0.7}
              disabled={isMarkingDone}
            >
              {isMarkingDone ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.doneButtonText}>ทำเสร็จแล้ว</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '88%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#F59E0B'
  },
  modalContainerOverdue: {
    borderColor: '#BF1737'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 2
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  headerTextContainer: {
    flex: 1
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    marginBottom: 1
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#1F2937'
  },
  content: {
    padding: 16,
    gap: 10
  },
  reminderTitle: {
    fontSize: 17,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    marginBottom: 6
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  descriptionContainer: {
    marginTop: 6,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#5FA7D1'
  },
  descriptionLabel: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#6B7280',
    marginBottom: 3
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#1F2937',
    lineHeight: 18
  },
  actions: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 5
  },
  acknowledgeButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#d1d5db'
  },
  acknowledgeButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#4b5563'
  },
  doneButton: {
    backgroundColor: '#4CAF50'
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_700Bold',
    color: '#fff'
  }
})
