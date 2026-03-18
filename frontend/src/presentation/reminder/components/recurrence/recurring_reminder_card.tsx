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
  Trash2,
} from 'lucide-react-native'
import React, { useRef, useState } from 'react'
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import DeleteConfirmationModal from '../modal/delete_confirmation_modal'
import VaccineCompleteModal from '../modal/vaccine_complete_modal'
import VaccineUndoModal from '../modal/vaccine_undo_modal'
import { Ionicons } from '@expo/vector-icons'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone,
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
  canDeleteAccess?: boolean
  onDeleteBlocked?: () => void
  onPress?: (id: string) => void
  onDelete?: (
    reminderId: string,
    deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES',
  ) => void
  onRefresh?: () => void
}

export default function RecurringReminderCard({
  reminder,
  instances,
  onPress,
  onDelete,
  onRefresh,
  canDelete,
  canDeleteAccess = true,
  onDeleteBlocked,
}: RecurringReminderCardProps) {
  // ------------------
  // CONST
  // ------------------
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showUndoModal, setShowUndoModal] = useState(false)
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
    showErrorAlert: true,
  })

  // Sort instances by date
  const sortedInstances = [...instances].sort((a, b) => {
    return (
      new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()
    )
  })

  // Get next due date (first incomplete instance)
  const nextInstance = sortedInstances.find(
    (inst) => inst.reminderStatus !== 'done',
  )

  const completedCount = sortedInstances.filter(
    (inst) => inst.reminderStatus === 'done',
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
            useNativeDriver: true,
          }).start()
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start()
        }
      },
    }),
  ).current

  // ------------------
  // HANDLERS
  // ------------------
  const handleDeletePress = () => {
    if (!canDeleteAccess) {
      closeDeleteButton()
      onDeleteBlocked?.()
      return
    }

    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    setShowDeleteModal(false)
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDelete?.(reminder.id)
    })
  }

  const closeDeleteButton = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start()
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
  }

  const handleToggleInstancePress = (
    instanceId: string,
    currentStatus: string,
    index: number,
  ) => {
    // If in temp done state, skip
    if (tempDoneIds.includes(instanceId)) {
      return
    }

    setSelectedInstance({ id: instanceId, status: currentStatus, index })

    // Show appropriate modal based on current status
    if (currentStatus === 'done') {
      // Show undo modal for marking back to todo
      setShowUndoModal(true)
    } else {
      // Show complete modal for marking as done
      setShowCompleteModal(true)
    }
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

  const handleConfirmUndo = async () => {
    if (!selectedInstance) return

    const { id: instanceId } = selectedInstance

    setShowUndoModal(false)
    setSelectedInstance(null)

    try {
      await updateStatusApi.execute(instanceId)

      setTimeout(() => {
        if (onRefresh) {
          onRefresh()
        }
      }, 200)
    } catch (error) {
      console.error('Failed to update instance status', error)
    }
  }

  const handleCancelUndo = () => {
    setShowUndoModal(false)
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
            <Trash2 size={24} color='#fff' strokeWidth={1.5} />
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
                  { backgroundColor: categoryInfo.color + '20' },
                ]}
              >
                <CategoryIcon size={16} color={categoryInfo.color} />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {reminder.reminderName}
              </Text>
              {/* Progress Badge */}
              <View
                style={[
                  styles.progressBadge,
                  {
                    backgroundColor:
                      completedCount === totalCount ? '#E6FFFA' : '#FFF4E6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressText,
                    {
                      color:
                        completedCount === totalCount ? '#15AD90' : '#FF9531',
                    },
                  ]}
                >
                  {completedCount}/{totalCount}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isExpanded ? (
                <ChevronUp size={18} color='#A6A6A6' />
              ) : (
                <ChevronDown size={18} color='#A6A6A6' />
              )}
            </TouchableOpacity>
          </View>

          {/* Combined Info Row */}
          <View style={styles.detailsRow}>
            <Ionicons name={'paw-outline'} size={11} color={'#6b7280'} />
            <Text style={styles.detailText} numberOfLines={1}>
              {reminder.pet_name}
            </Text>
            <View style={styles.separator} />
            <BriefcaseMedical size={11} color='#6B7280' />
            <Text style={styles.detailText} numberOfLines={1}>
              {totalCount} เข็ม
            </Text>
          </View>

          {/* Status Row */}
          <View style={styles.statusRow}>
            {completedCount === totalCount ? (
              <View style={styles.statusBadge}>
                <Check size={13} color='#15AD90' />
                <Text style={[styles.statusText, { color: '#15AD90' }]}>
                  ฉีดครบแล้ว
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: (() => {
                        const diffDays = nextInstance
                          ? dayjs(nextInstance.reminderDate).diff(
                              dayjs(),
                              'day',
                            )
                          : 0
                        return diffDays < 0 ? '#FEE2E2' : '#FEF3C7'
                      })(),
                    },
                  ]}
                >
                  <Calendar
                    size={13}
                    color={(() => {
                      const diffDays = nextInstance
                        ? dayjs(nextInstance.reminderDate).diff(dayjs(), 'day')
                        : 0
                      return diffDays < 0 ? '#BF1737' : '#F59E0B'
                    })()}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: (() => {
                          const diffDays = nextInstance
                            ? dayjs(nextInstance.reminderDate).diff(
                                dayjs(),
                                'day',
                              )
                            : 0
                          return diffDays < 0 ? '#BF1737' : '#F59E0B'
                        })(),
                      },
                    ]}
                  >
                    {(() => {
                      const diffDays = nextInstance
                        ? dayjs(nextInstance.reminderDate).diff(dayjs(), 'day')
                        : 0

                      return diffDays < 0
                        ? `เลยกำหนด ${Math.abs(diffDays)} วัน`
                        : diffDays === 0
                          ? 'วันนี้'
                          : `อีก ${diffDays} วัน`
                    })()}
                  </Text>
                </View>
                {nextInstance && nextInstance.reminderTime && (
                  <>
                    <View style={styles.separator} />
                    <Clock size={11} color='#6B7280' />
                    <Text style={styles.detailText}>
                      {formatTime(nextInstance.reminderTime)}
                    </Text>
                  </>
                )}
              </>
            )}
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
                  index === sortedInstances.length - 1 &&
                    styles.instanceRowLast,
                ]}
              >
                <TouchableOpacity
                  onPress={() =>
                    handleToggleInstancePress(
                      instance.id,
                      instance.reminderStatus,
                      index,
                    )
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      (instance.reminderStatus === 'done' ||
                        tempDoneIds.includes(instance.id)) &&
                        styles.checkboxCompleted,
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
                          color: '#BF1737',
                        },
                      ]}
                    >
                      {instance.reminderName}/{totalCount}
                    </Text>
                    <View style={styles.infoRow}>
                      <Clock
                        size={11}
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
                            color: '#BF1737',
                          },
                        ]}
                      >
                        {instance.reminderTime
                          ? `${formatDate(instance.reminderDate)}, ${formatTime(
                              instance.reminderTime,
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
                          : '#FFF4E6',
                    },
                  ]}
                >
                  {instance.reminderStatus === 'done' ||
                  tempDoneIds.includes(instance.id) ? (
                    <Check size={18} color='#15AD90' />
                  ) : (
                    <Hourglass size={18} color='#FF9531' />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Modals */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        reminderName={reminder.reminderName}
        totalCount={totalCount}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <VaccineCompleteModal
        visible={showCompleteModal}
        doseNumber={(selectedInstance?.index ?? 0) + 1}
        totalCount={totalCount}
        onConfirm={handleConfirmComplete}
        onCancel={handleCancelComplete}
      />

      <VaccineUndoModal
        visible={showUndoModal}
        doseNumber={(selectedInstance?.index ?? 0) + 1}
        totalCount={totalCount}
        onConfirm={handleConfirmUndo}
        onCancel={handleCancelUndo}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative',
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteButton: {
    backgroundColor: '#BF1737',
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
  },
  swipeableCard: {
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#1F2937',
    flex: 1,
    minWidth: 0,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  progressText: {
    fontSize: 11,
    fontFamily: 'Prompt_700Bold',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
  },
  separator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E6FFFA',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Prompt_500Medium',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    zIndex: -1,
  },
  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  instanceRowLast: {
    borderBottomWidth: 0,
  },
  instanceLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    paddingLeft: 10,
  },
  iconTimeContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#A6A6A6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxCompleted: {
    borderColor: '#5FA7D1',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5FA7D1',
  },
  instanceInfo: {
    flex: 1,
    gap: 3,
  },
  instanceDate: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
  },
  instanceLabel: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#1F2937',
  },
})
