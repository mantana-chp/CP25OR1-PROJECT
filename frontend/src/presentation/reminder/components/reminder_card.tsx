import { IReminder, getCategoryInfo } from '@/src/domain/reminder.domain'
import React, { useRef } from 'react'

import dayjs from 'dayjs'
import 'dayjs/locale/th'

import {
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Modal from '../../components/modal'

import {
  convertFromBackendRecurrence,
  formatRecurrenceText
} from '@/src/utils/recurrence.utils'
import {
  Bone,
  ChevronRight,
  Paperclip,
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
                <Trash2 size={24} color="#fff" strokeWidth={1.5} />
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
            <View style={styles.headerRow}>
              <Text
                style={[
                  styles.reminderTitle,
                  reminder?.reminderStatus === 'overdue' &&
                    styles.overdueTitleText,
                  isVirtual && styles.virtualText,
                  isDone && styles.lineThroughText
                ]}
                numberOfLines={1}
              >
                {reminder?.reminderName}
              </Text>
              {!isVirtual && reminder?.recurrence && (
                <View style={styles.recurringBadge}>
                  <Repeat size={10} color="#5FA7D1" />
                </View>
              )}
            </View>

            <View style={styles.detailsRow}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: categoryInfo.color + '20' }
                ]}
              >
                <CategoryIcon size={10} color={categoryInfo.color} />
                <Text
                  style={[styles.categoryText, { color: categoryInfo.color }]}
                >
                  {categoryInfo.label}
                </Text>
              </View>
              <View style={styles.separator} />
              <Text
                style={[
                  styles.petNameText,
                  reminder?.reminderStatus === 'overdue' && styles.overdueText,
                  isVirtual && styles.virtualText,
                  isDone && styles.doneText
                ]}
                numberOfLines={1}
              >
                {reminder?.pet_name || '-'}
              </Text>
              <View style={styles.separator} />
              <Text
                style={[
                  styles.dateTimeText,
                  reminder?.reminderStatus === 'overdue' && styles.overdueText,
                  isVirtual && styles.virtualText,
                  isDone && styles.doneText
                ]}
              >
                {formattedTime
                  ? `${formattedDate}, ${formattedTime} น.`
                  : formattedDate}
              </Text>

              {reminder?.attachments?.length > 0 && (
                <>
                  <View style={styles.separator} />
                  <Paperclip
                    size={10}
                    color={
                      isDone
                        ? '#9CA3AF'
                        : reminder?.reminderStatus === 'overdue'
                          ? '#BF1737'
                          : isVirtual
                            ? '#D1D5DB'
                            : '#9CA3AF'
                    }
                  />
                  <Text
                    style={[
                      styles.dateTimeText,
                      reminder?.reminderStatus === 'overdue' &&
                        styles.overdueText,
                      isVirtual && styles.virtualText,
                      isDone && styles.doneText
                    ]}
                  >
                    {reminder?.attachments?.length} ไฟล์แนบ
                  </Text>
                </>
              )}
            </View>

            {/* Recurrence info if recurring */}
            {reminder?.recurrence && (
              <View style={styles.recurrenceRow}>
                <Repeat
                  size={11}
                  color={
                    isDone
                      ? '#9CA3AF'
                      : reminder?.reminderStatus === 'overdue'
                        ? '#BF1737'
                        : '#5FA7D1'
                  }
                />
                <Text
                  style={[
                    styles.recurrenceText,
                    reminder?.reminderStatus === 'overdue' &&
                      styles.overdueText,
                    ,
                    isDone && styles.doneText
                  ]}
                  numberOfLines={1}
                >
                  {formatRecurrenceText(
                    convertFromBackendRecurrence(reminder.recurrence),
                    'th'
                  )}
                  {reminder.occurrenceNumber &&
                    reminder.occurrenceNumber > 1 &&
                    ` (ครั้งที่ ${reminder.occurrenceNumber})`}
                </Text>
              </View>
            )}
          </View>

          {/* Right side - Chevron */}
          <ChevronRight
            size={16}
            color={
              isVirtual
                ? '#D1D5DB'
                : isDone
                  ? '#9CA3AF'
                  : reminder?.reminderStatus === 'overdue'
                    ? '#BF1737'
                    : '#2E759E'
            }
            style={styles.chevron}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Delete Confirmation Modal */}
      <Modal
        variant="confirmation"
        visible={showDeleteModal}
        onClose={handleCancelDelete}
        icon="trash"
        title="ยืนยันการลบ"
        message={`ต้องการลบเตือนความจำ "${reminder.reminderName}" ใช่หรือไม่?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        onConfirm={handleConfirmDelete}
        confirmVariant="error"
        isLoading={isDeleting}
      />

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
    marginBottom: 8,
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
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3
  },
  cardTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10
  },
  leftSection: {
    paddingRight: 0
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    borderRadius: 6,
    backgroundColor: '#5FA7D1'
  },
  middleSection: {
    flex: 1,
    gap: 3
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  recurringBadge: {
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center'
  },
  virtualText: {
    color: '#9CA3AF'
  },
  lineThroughText: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through'
  },
  doneText: {
    color: '#9CA3AF'
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Prompt_400Regular'
  },
  separator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB'
  },
  recurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  recurrenceText: {
    fontSize: 11,
    color: '#5FA7D1',
    fontFamily: 'Prompt_400Regular',
    flex: 1
  },
  reminderTitle: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Prompt_500Medium',
    flex: 1
  },
  overdueTitleText: {
    color: '#BF1737'
  },
  petNameText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Prompt_400Regular'
  },
  dateTimeText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Prompt_400Regular'
  },
  overdueText: {
    color: '#BF1737'
  },
  chevron: {
    marginLeft: 4
  }
})
