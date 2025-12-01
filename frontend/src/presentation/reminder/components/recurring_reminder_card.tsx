import { getCategoryInfo, IReminder } from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import {
  Bone,
  BriefcaseMedical,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  PawPrint,
  Pill,
  Pipette,
  Scissors,
  Stethoscope,
  Syringe,
  Tag,
  Trash2
} from 'lucide-react-native'
import React, { useRef, useState } from 'react'
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

interface RecurringInstance {
  id: string
  userId: string
  petId: string
  categoryName: string
  reminderName: string
  description: string
  reminderDate: string
  reminderTime: string
  reminderStatus: string
  createdAt: string
  updatedAt: string
}

interface RecurringReminderCardProps {
  reminder: IReminder
  instances: IReminder[]
  canDelete?: boolean
  onPress?: (id: string) => void
  onDelete?: (reminderId: string) => void
  onRefresh?: () => void
}

export default function RecurringReminderCard({
  reminder,
  instances,
  onPress,
  onDelete,
  onRefresh,
  canDelete
}: RecurringReminderCardProps) {
  // ------------------
  // CONST
  // ------------------
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<{
    id: string
    status: string
    index: number
  } | null>(null)
  const [tempDoneIds, setTempDoneIds] = useState<string[]>([])
  const translateX = useRef(new Animated.Value(0)).current
  const categoryInfo = getCategoryInfo(reminder?.categoryName || 'General')
  const CategoryIcon = ICON_MAP[categoryInfo.icon] || Tag

  const updateStatusApi = useApi(reminderService.updateReminderStatus, {
    showErrorAlert: true
  })

  // Sort instances by date
  const sortedInstances = [...instances].sort((a, b) => {
    return (
      new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()
    )
  })

  // Get next due date (first incomplete instance)
  const nextInstance = sortedInstances.find(
    (inst) => inst.reminderStatus !== 'done'
  )

  const completedCount = sortedInstances.filter(
    (inst) => inst.reminderStatus === 'done'
  ).length
  const totalCount = sortedInstances.length

  const formatDate = (dateString: string) => {
    const date = dayjs(dateString).locale('th')
    const formattedDate = `${date.format('วันdddd DD MMM')} ${
      date.year() + 543
    }`
    return formattedDate
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) + ' น.'
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -80))
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true
          }).start()
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true
          }).start()
        }
      }
    })
  ).current

  // ------------------
  // HANDLERS
  // ------------------
  const handleDeletePress = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    setShowDeleteModal(false)
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      onDelete?.(reminder.id)
    })
  }

  const closeDeleteButton = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start()
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
  }

  const handleToggleInstancePress = (
    instanceId: string,
    currentStatus: string,
    index: number
  ) => {
    // If already done or in temp done state, skip confirmation
    if (currentStatus === 'done' || tempDoneIds.includes(instanceId)) {
      return
    }

    // Show confirmation modal for marking as done
    setSelectedInstance({ id: instanceId, status: currentStatus, index })
    setShowCompleteModal(true)
  }

  const handleConfirmComplete = async () => {
    if (!selectedInstance) return

    const { id: instanceId, status: currentStatus } = selectedInstance

    setShowCompleteModal(false)
    setSelectedInstance(null)

    if (currentStatus === 'to_do' || currentStatus === 'overdue') {
      setTempDoneIds((prev) => [...prev, instanceId])
    }

    try {
      await updateStatusApi.execute(instanceId)

      setTimeout(() => {
        if (onRefresh) {
          onRefresh()
        }
      }, 200)
    } catch (error) {
      console.error('Failed to update instance status', error)
      if (currentStatus === 'to_do' || currentStatus === 'overdue') {
        setTempDoneIds((prev) => prev.filter((id) => id !== instanceId))
      }
    }
  }

  const handleCancelComplete = () => {
    setShowCompleteModal(false)
    setSelectedInstance(null)
  }

  const handleCardPress = () => {
    const currentPosition = (translateX as any)._value || 0

    if (currentPosition < -5) {
      closeDeleteButton()
    } else {
      if (onPress) {
        onPress(reminder.id)
      }
    }
  }

  // ------------------
  // RENDER
  // ------------------
  return (
    <View style={styles.container}>
      {/* Delete Button (Behind) */}
      {canDelete && (
        <View style={styles.deleteContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePress}
            activeOpacity={0.8}
          >
            <Trash2 size={24} color="#fff" />
            <Text style={styles.deleteText}>ลบ</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Card (Swipeable) */}
      <Animated.View
        style={[styles.swipeableCard, { transform: [{ translateX }] }]}
        {...(canDelete ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          style={[styles.card, { borderLeftColor: '#EC4899' }]}
          activeOpacity={1}
          onPress={handleCardPress}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: categoryInfo.color + '20' }
                ]}
              >
                <CategoryIcon size={20} color={categoryInfo.color} />
              </View>
              <Text style={styles.title}>{reminder.reminderName}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isExpanded ? (
                <ChevronUp size={24} color="#A6A6A6" />
              ) : (
                <ChevronDown size={24} color="#A6A6A6" />
              )}
            </TouchableOpacity>
          </View>

          {/* Info Row */}
          <View style={styles.infoRow}>
            <PawPrint size={14} color="#2E759E" />
            <Text style={styles.petName}>{reminder.pet_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <BriefcaseMedical size={14} color="#2E759E" />
            <Text style={styles.countText}>
              {`${reminder?.children[0].reminderName.slice(
                0,
                -10
              )} (${totalCount} เข็ม)`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Calendar
              size={14}
              color={
                completedCount === totalCount
                  ? '#15AD90'
                  : (() => {
                      const diffDays = nextInstance
                        ? dayjs(nextInstance.reminderDate).diff(dayjs(), 'day')
                        : 0
                      return diffDays < 0 ? '#BF1737' : '#FF9531'
                    })()
              }
            />
            <Text
              style={[
                styles.nextDueText,
                {
                  color:
                    completedCount === totalCount
                      ? '#15AD90'
                      : (() => {
                          const diffDays = nextInstance
                            ? dayjs(nextInstance.reminderDate).diff(
                                dayjs(),
                                'day'
                              )
                            : 0
                          return diffDays < 0 ? '#BF1737' : '#FF9531'
                        })()
                }
              ]}
            >
              {completedCount === totalCount
                ? 'ฉีดวัคซีนครบตามกำหนด'
                : (() => {
                    const diffDays = nextInstance
                      ? dayjs(nextInstance.reminderDate).diff(dayjs(), 'day')
                      : 0

                    return diffDays < 0
                      ? `เลยกำหนดมาแล้ว ${Math.abs(diffDays)} วัน`
                      : `ครั้งถัดไปอีก ${diffDays} วัน`
                  })()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Expanded Instances List */}
        {isExpanded && (
          <View style={styles.instancesContainer}>
            {sortedInstances.map((instance, index) => (
              <View
                key={instance.id}
                style={[
                  styles.instanceRow,
                  index === sortedInstances.length - 1 && styles.instanceRowLast
                ]}
              >
                <TouchableOpacity
                  onPress={() =>
                    handleToggleInstancePress(
                      instance.id,
                      instance.reminderStatus,
                      index
                    )
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      (instance.reminderStatus === 'done' ||
                        tempDoneIds.includes(instance.id)) &&
                        styles.checkboxCompleted
                    ]}
                  >
                    {(instance.reminderStatus === 'done' ||
                      tempDoneIds.includes(instance.id)) && (
                      <View style={styles.checkboxInner} />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.instanceLeft}>
                  <View style={styles.instanceInfo}>
                    <Text
                      style={[
                        styles.instanceLabel,
                        instance.reminderStatus === 'overdue' && {
                          color: '#BF1737'
                        }
                      ]}
                    >
                      {instance.reminderName}/{totalCount}
                    </Text>
                    <View style={styles.infoRow}>
                      <Clock
                        size={12}
                        color={
                          instance.reminderStatus === 'overdue'
                            ? '#BF1737'
                            : '#225877'
                        }
                      />
                      <Text
                        style={[
                          styles.instanceDate,
                          instance.reminderStatus === 'overdue' && {
                            color: '#BF1737'
                          }
                        ]}
                      >
                        {instance.reminderTime
                          ? `${formatDate(instance.reminderDate)}, ${formatTime(
                              instance.reminderTime
                            )}`
                          : formatDate(instance.reminderDate)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.iconTimeContainer,
                    {
                      backgroundColor:
                        instance.reminderStatus === 'done' ||
                        tempDoneIds.includes(instance.id)
                          ? '#E6FFFA'
                          : '#FFF4E6'
                    }
                  ]}
                >
                  {instance.reminderStatus === 'done' ||
                  tempDoneIds.includes(instance.id) ? (
                    <Check size={20} color="#15AD90" />
                  ) : (
                    <Hourglass size={20} color="#FF9531" />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ยืนยันการลบ</Text>
            <Text style={styles.modalMessage}>
              การลบเตือนความจำนี้จะลบเตือนความจำทั้งหมดใน{' '}
              <Text style={styles.modalBold}>{reminder.reminderName}</Text> (
              {totalCount} รายการ)
            </Text>
            <Text style={styles.modalSubMessage}>คุณแน่ใจหรือไม่?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButtonModal]}
                onPress={handleConfirmDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteButtonText}>ลบทั้งหมด</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Confirmation Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelComplete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ยืนยันการทำเครื่องหมาย</Text>
            <Text style={styles.modalMessage}>
              คุณต้องการทำเครื่องหมาย{' '}
              <Text style={styles.modalBold}>
                วัคซีนเข็มที่ {(selectedInstance?.index ?? 0) + 1}/{totalCount}
              </Text>{' '}
              ว่าเสร็จสิ้นแล้วใช่หรือไม่?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelComplete}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.completeButtonModal]}
                onPress={handleConfirmComplete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteButtonText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative'
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  deleteButton: {
    backgroundColor: '#BF1737',
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    gap: 4
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Prompt_500Medium'
  },
  swipeableCard: {
    width: '100%'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    flex: 1
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  petName: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  countText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  nextDueText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium'
  },
  instancesContainer: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    zIndex: -1
  },
  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  instanceRowLast: {
    borderBottomWidth: 0
  },
  instanceLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingLeft: 16
  },
  iconTimeContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A6A6A6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  checkboxCompleted: {
    borderColor: '#D4B5F5'
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D4B5F5'
  },
  instanceInfo: {
    flex: 1,
    gap: 4
  },
  instanceDate: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  instanceLabel: {
    fontSize: 14,
    fontFamily: 'Prompt_700Bold',
    color: '#225877'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    textAlign: 'center',
    lineHeight: 24
  },
  modalBold: {
    fontFamily: 'Prompt_700Bold',
    color: '#ef4444'
  },
  modalSubMessage: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#6b7280',
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#4b5563'
  },
  deleteButtonModal: {
    backgroundColor: '#ef4444'
  },
  completeButtonModal: {
    backgroundColor: '#15AD90'
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#fff'
  }
})
