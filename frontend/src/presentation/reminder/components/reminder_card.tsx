import { IReminder, getCategoryInfo } from '@/src/domain/reminder.domain'
import React, { useRef } from 'react'

import dayjs from 'dayjs'
import 'dayjs/locale/th'

import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

import {
  convertFromBackendRecurrence,
  formatRecurrenceText
} from '@/src/utils/recurrence.utils'
import {
  Bone,
  Clock,
  PawPrint,
  Pill,
  Pipette,
  Repeat,
  Scissors,
  Stethoscope,
  Syringe,
  Tag,
  Trash2
} from 'lucide-react-native'
import DeleteSeriesModal from './modal/delete_series_modal'

interface ReminderCardProps {
  reminder: IReminder
  onDelete?: (
    id: string,
    deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES'
  ) => void
  isDeleting?: boolean
  canDelete?: boolean
  onPress?: (id: string) => void
  onToggleStatus?: (id: string, currentStatus: string) => void
  isTempDone?: boolean
  hideToggle?: boolean
}

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

export default function ReminderCard(props: ReminderCardProps) {
  // ------------------
  // STATE
  // ------------------
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [showSeriesModal, setShowSeriesModal] = React.useState(false)

  // ------------------
  // CONST
  // ------------------
  const {
    reminder,
    onDelete,
    isDeleting = false,
    canDelete,
    onPress,
    onToggleStatus,
    isTempDone = false,
    hideToggle = false
  } = props

  // Check if this is a virtual reminder
  const isVirtual = reminder.isVirtual === true

  const date = dayjs(reminder.reminderDate).locale('th')
  const formattedDate = `${date.format('วันdddd DD MMM')} ${date.year() + 543}`
  const formattedTime = reminder?.reminderTime
    ? reminder.reminderTime.substring(0, 5)
    : ''

  const isDone = reminder?.reminderStatus === 'done' || isTempDone
  const categoryInfo = getCategoryInfo(reminder?.categoryName || 'General')
  const CategoryIcon = ICON_MAP[categoryInfo.icon] || Tag

  // ------------------
  // ANIMATION
  // ------------------
  const translateX = useRef(new Animated.Value(0)).current
  const swipePosition = useRef(0)

  translateX.addListener(({ value }) => {
    swipePosition.current = value
  })

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

  const closeDeleteButton = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start()
  }

  const handleDeletePress = () => {
    // For virtual reminders, show series modal to delete the recurring rule
    if (isVirtual) {
      if (reminder.recurrence) {
        setShowSeriesModal(true)
      }
      return
    }

    // Check if reminder is recurring
    if (reminder.recurrence) {
      setShowSeriesModal(true)
    } else {
      setShowDeleteModal(true)
    }
  }

  const handleConfirmDelete = () => {
    if (isDeleting) return

    setShowDeleteModal(false)
    closeDeleteButton()

    if (onDelete) {
      onDelete(reminder.id)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
  }

  const handleDeleteThisOnly = () => {
    if (isDeleting) return

    setShowSeriesModal(false)
    closeDeleteButton()

    if (onDelete) {
      onDelete(reminder.id, 'THIS_INSTANCE_ONLY')
    }
  }

  const handleDeleteAll = () => {
    if (isDeleting) return

    setShowSeriesModal(false)
    closeDeleteButton()

    if (onDelete) {
      onDelete(reminder.id, 'ALL_INSTANCES')
    }
  }

  const handleCloseSeriesModal = () => {
    setShowSeriesModal(false)
  }

  const handleCardPress = () => {
    if (swipePosition.current < 0) {
      closeDeleteButton()
    } else {
      if (onPress) {
        onPress(reminder.id)
      }
    }
  }

  const handleToggleStatus = () => {
    if (!onToggleStatus) return
    onToggleStatus(reminder.id, reminder.reminderStatus)
  }

  // ------------------
  // RENDER
  // ------------------
  return (
    <View style={styles.container}>
      {/* Delete Button Background - Only for non-virtual deletable reminders */}
      {canDelete && !isVirtual && (
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeletePress}
            activeOpacity={0.8}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Trash2 size={24} color="#fff" />
                <Text style={styles.deleteText}>ลบ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Swipeable Card */}
      <Animated.View
        style={[
          styles.reminderCard,
          {
            transform: [{ translateX }],
            borderLeftColor:
              reminder?.reminderStatus === 'overdue' ? '#BF1737' : '#88BEDD',
            backgroundColor: isVirtual
              ? '#F9FAFB' // Light gray for virtual reminders
              : reminder?.reminderStatus === 'overdue'
                ? '#FEF2F2'
                : '#fff'
          }
        ]}
        {...(canDelete && !isVirtual ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCardPress}
          style={styles.cardTouchable}
        >
          {/* Left side - Checkbox circle (disabled for virtual reminders) */}
          {!hideToggle && (
            <TouchableOpacity
              style={styles.leftSection}
              onPress={handleToggleStatus}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isVirtual}
            >
              <View
                style={[
                  styles.checkbox,
                  isDone && styles.checkboxCompleted,
                  isVirtual && styles.checkboxDisabled
                ]}
              >
                {isDone && <View style={styles.checkboxInner} />}
              </View>
            </TouchableOpacity>
          )}

          {/* Middle section - Content */}
          <View style={styles.middleSection}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.reminderTitle,
                  reminder?.reminderStatus === 'overdue' &&
                    styles.overdueTitleText,
                  isVirtual && styles.virtualText
                ]}
              >
                {reminder?.reminderName}
              </Text>
              {/* Show recurring badge for non-virtual reminders */}
              {!isVirtual && reminder?.recurrence && (
                <View style={styles.recurringBadge}>
                  <Repeat size={12} color="#5FA7D1" />
                </View>
              )}
            </View>

            <View style={styles.infoRow}>
              <PawPrint
                size={14}
                color={
                  isVirtual
                    ? '#9CA3AF'
                    : reminder?.reminderStatus === 'overdue'
                      ? '#BF1737'
                      : '#2E759E'
                }
              />
              <Text
                style={[
                  styles.petNameText,
                  reminder?.reminderStatus === 'overdue' && styles.overdueText,
                  isVirtual && styles.virtualText
                ]}
              >
                {reminder?.pet_name || '-'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Clock
                size={14}
                color={
                  isVirtual
                    ? '#9CA3AF'
                    : reminder?.reminderStatus === 'overdue'
                      ? '#BF1737'
                      : '#2E759E'
                }
              />
              <Text
                style={[
                  styles.dateTimeText,
                  reminder?.reminderStatus === 'overdue' && styles.overdueText,
                  isVirtual && styles.virtualText
                ]}
              >
                {formattedTime
                  ? `${formattedDate}, ${formattedTime} น.`
                  : formattedDate}
              </Text>
            </View>
            {/* Recurrence info if recurring */}
            {reminder?.recurrence && (
              <View style={styles.infoRow}>
                <Repeat
                  size={14}
                  color={
                    reminder?.reminderStatus === 'overdue'
                      ? '#BF1737'
                      : '#5FA7D1'
                  }
                />
                <Text
                  style={[
                    styles.recurrenceText,
                    reminder?.reminderStatus === 'overdue' && styles.overdueText
                  ]}
                >
                  {formatRecurrenceText(
                    convertFromBackendRecurrence(reminder.recurrence),
                    'th'
                  )}
                  {reminder.occurrenceNumber &&
                    reminder.occurrenceNumber > 1 && (
                      <Text style={styles.occurrenceNumber}>
                        {' '}
                        (ครั้งที่ {reminder.occurrenceNumber})
                      </Text>
                    )}
                </Text>
              </View>
            )}
          </View>

          {/* Right side - Category tag */}
          <View
            style={[
              styles.categoryTag,
              {
                backgroundColor: categoryInfo.color + '20',
                borderColor: categoryInfo.color
              }
            ]}
          >
            <CategoryIcon size={12} color={categoryInfo.color} />
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </Text>
          </View>
        </TouchableOpacity>
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
              คุณต้องการลบเตือนความจำ{' '}
              <Text style={styles.modalBold}>{reminder.reminderName}</Text>{' '}
              หรือไม่?
            </Text>
            <Text style={styles.modalSubMessage}>
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Text>

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
                <Text style={styles.deleteButtonText}>ลบ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Series Modal for Recurring Reminders */}
      <DeleteSeriesModal
        visible={showSeriesModal}
        onClose={handleCloseSeriesModal}
        onDeleteThisOnly={handleDeleteThisOnly}
        onDeleteAll={handleDeleteAll}
        reminderName={reminder.reminderName}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative'
  },
  deleteButtonContainer: {
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
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 6
  },
  cardTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  leftSection: {
    marginRight: 14
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#A6A6A6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxCompleted: {
    borderColor: '#5FA7D1'
  },
  checkboxDisabled: {
    borderColor: '#D1D5DB',
    opacity: 0.5
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 12,
    backgroundColor: '#5FA7D1'
  },
  middleSection: {
    flex: 1,
    gap: 2
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  recurringBadge: {
    backgroundColor: '#E8F4F8',
    borderRadius: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  virtualText: {
    color: '#6B7280'
  },
  recurrenceText: {
    fontSize: 12,
    color: '#5FA7D1',
    fontFamily: 'Prompt_400Regular'
  },
  occurrenceNumber: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Prompt_400Regular'
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 0.5
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Prompt_400Regular'
  },
  reminderTitle: {
    fontSize: 16,
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  overdueTitleText: {
    color: '#BF1737',
    fontFamily: 'Prompt_700Bold'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  petNameText: {
    fontSize: 13,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  dateTimeText: {
    fontSize: 13,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  overdueText: {
    color: '#BF1737',
    fontFamily: 'Prompt_700Bold'
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
    color: '#BF1737'
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
    paddingVertical: 8,
    borderRadius: 20,
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
    backgroundColor: '#BF1737'
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#fff'
  }
})
