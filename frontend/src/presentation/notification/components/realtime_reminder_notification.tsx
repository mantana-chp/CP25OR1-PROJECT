import { IReminder } from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import dayjs from 'dayjs'
import { AlertCircle, Bell, Check, Clock, PawPrint } from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

const SHOWN_REMINDERS_KEY = '@realtime_shown_reminders'
const CHECK_INTERVAL = 30000 // Check every 30 seconds (catches reminders within 1-minute window)

interface RealtimeReminderNotificationProps {
  onReminderShown?: (reminder: IReminder) => void
  onReminderCompleted?: (reminderId: string) => void
}

export default function RealtimeReminderNotification({
  onReminderShown,
  onReminderCompleted
}: RealtimeReminderNotificationProps) {
  const [visible, setVisible] = useState(false)
  const [currentReminders, setCurrentReminders] = useState<IReminder[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
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
        const remindersToShow = dueReminders.filter(
          (r) => !shownReminderIds.has(r.id)
        )
        if (remindersToShow.length > 0) {
          showNotifications(remindersToShow)
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

    // Check if reminder time matches current time (within 1-minute window)
    const reminderDateTime = dayjs(`${reminderDate} ${reminderTime}`)
    const now = dayjs()
    const minutesDiff = now.diff(reminderDateTime, 'minute')

    // Show notification right at reminder time (0 to 1 minute after scheduled time)
    // This gives a small window to catch the notification even if check runs between intervals
    return minutesDiff >= 0 && minutesDiff <= 1
  }

  const showNotifications = (reminders: IReminder[]) => {
    setCurrentReminders(reminders)
    setCompletedIds(new Set())
    setVisible(true)

    // Save all shown reminders
    reminders.forEach((reminder) => {
      saveShownReminder(reminder.id)
      onReminderShown?.(reminder)
    })

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
      setCurrentReminders([])
      setCompletedIds(new Set())
      slideAnim.setValue(0)
    })
  }

  const handleToggleReminder = (reminderId: string) => {
    setCompletedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(reminderId)) {
        newSet.delete(reminderId)
      } else {
        newSet.add(reminderId)
      }
      return newSet
    })
  }

  const handleMarkDone = async () => {
    if (currentReminders.length === 0 || isMarkingDone) return

    const idsToComplete = Array.from(completedIds)
    if (idsToComplete.length === 0) {
      Alert.alert(
        'กรุณาเลือกรายการ',
        'โปรดเลือกอย่างน้อย 1 รายการที่ต้องการทำเครื่องหมายเสร็จ'
      )
      return
    }

    try {
      setIsMarkingDone(true)

      // Mark all selected reminders as done
      await Promise.all(idsToComplete.map((id) => updateStatusApi.execute(id)))

      // Notify parent for each completed reminder
      idsToComplete.forEach((id) => {
        onReminderCompleted?.(id)
      })

      // Refetch data
      await getRemindersApi.execute()

      handleAcknowledge()
    } catch (error) {
      console.error('Error marking reminders as done:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถทำเครื่องหมายเสร็จได้')
    } finally {
      setIsMarkingDone(false)
    }
  }

  const handleMarkAllDone = async () => {
    if (currentReminders.length === 0 || isMarkingDone) return

    try {
      setIsMarkingDone(true)

      const allIds = currentReminders.map((r) => r.id)

      // Mark all reminders as done
      await Promise.all(allIds.map((id) => updateStatusApi.execute(id)))

      // Notify parent for each completed reminder
      allIds.forEach((id) => {
        onReminderCompleted?.(id)
      })

      // Refetch data
      await getRemindersApi.execute()

      handleAcknowledge()
    } catch (error) {
      console.error('Error marking all reminders as done:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถทำเครื่องหมายเสร็จได้')
    } finally {
      setIsMarkingDone(false)
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return timeString.substring(0, 5) + ' น.'
  }

  const getStatusText = (reminders: IReminder[]) => {
    const overdueCount = reminders.filter(
      (r) => r.reminderStatus === 'overdue'
    ).length
    if (overdueCount > 0) {
      return `${overdueCount} รายการเกินกำหนด`
    }
    return 'ถึงเวลาแล้ว'
  }

  const getStatusColor = (reminders: IReminder[]) => {
    const hasOverdue = reminders.some((r) => r.reminderStatus === 'overdue')
    return hasOverdue ? '#BF1737' : '#F59E0B'
  }

  if (!visible || currentReminders.length === 0) {
    return null
  }

  const isOverdue = currentReminders.some((r) => r.reminderStatus === 'overdue')
  const statusColor = getStatusColor(currentReminders)

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
                {getStatusText(currentReminders)}
              </Text>
              <Text style={styles.headerTitle}>
                {currentReminders.length} เตือนความจำ
              </Text>
            </View>
          </View>

          {/* Content - List of Reminders */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {currentReminders.map((reminder, index) => (
              <TouchableOpacity
                key={reminder.id}
                style={[
                  styles.reminderItem,
                  index === currentReminders.length - 1 &&
                    styles.reminderItemLast
                ]}
                onPress={() => handleToggleReminder(reminder.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    completedIds.has(reminder.id) && styles.checkboxChecked
                  ]}
                >
                  {completedIds.has(reminder.id) && (
                    <Check size={14} color="#fff" />
                  )}
                </View>

                <View style={styles.reminderContent}>
                  <Text
                    style={[
                      styles.reminderTitle,
                      reminder.reminderStatus === 'overdue' &&
                        styles.overdueTitle
                    ]}
                    numberOfLines={1}
                  >
                    {reminder.reminderName}
                  </Text>

                  <View style={styles.reminderDetails}>
                    {reminder.pet_name && (
                      <View style={styles.detailRow}>
                        <Ionicons
                          name={'paw-outline'}
                          size={12}
                          color={'#6b7280'}
                        />
                        <Text style={styles.detailText} numberOfLines={1}>
                          {reminder.pet_name}
                        </Text>
                      </View>
                    )}

                    {reminder.reminderTime && (
                      <View style={styles.detailRow}>
                        <Clock
                          size={12}
                          color={
                            reminder.reminderStatus === 'overdue'
                              ? '#BF1737'
                              : '#6B7280'
                          }
                        />
                        <Text
                          style={[
                            styles.detailText,
                            reminder.reminderStatus === 'overdue' &&
                              styles.overdueText
                          ]}
                        >
                          {formatTime(reminder.reminderTime)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.acknowledgeButton]}
              onPress={handleAcknowledge}
              activeOpacity={0.7}
              disabled={isMarkingDone}
            >
              <Text style={styles.acknowledgeButtonText}>ปิด</Text>
            </TouchableOpacity>

            {currentReminders.length > 1 && completedIds.size === 0 && (
              <TouchableOpacity
                style={[styles.button, styles.allDoneButton]}
                onPress={handleMarkAllDone}
                activeOpacity={0.7}
                disabled={isMarkingDone}
              >
                {isMarkingDone ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.doneButtonText}>ทำเสร็จทั้งหมด</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {completedIds.size > 0 && (
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
                    <Text style={styles.doneButtonText}>
                      เสร็จแล้ว ({completedIds.size})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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
  scrollContent: {
    maxHeight: 320
  },
  scrollContentContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12
  },
  reminderItemLast: {
    borderBottomWidth: 0
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#5FA7D1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: '#5FA7D1',
    borderColor: '#5FA7D1'
  },
  reminderContent: {
    flex: 1,
    gap: 4
  },
  reminderTitle: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 14,
    color: '#111827'
  },
  overdueTitle: {
    color: '#BF1737'
  },
  reminderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 12,
    color: '#6B7280'
  },
  overdueText: {
    color: '#BF1737'
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6
  },
  acknowledgeButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    maxWidth: 100
  },
  acknowledgeButtonText: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 14,
    color: '#374151'
  },
  doneButton: {
    backgroundColor: '#16A34A'
  },
  allDoneButton: {
    backgroundColor: '#16A34A'
  },
  doneButtonText: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 14,
    color: '#fff'
  }
})
