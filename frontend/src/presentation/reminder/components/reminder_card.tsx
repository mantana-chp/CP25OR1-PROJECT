import { IReminder, getCategoryInfo } from '@/src/domain/reminder.domain'
import React, { useRef } from 'react'

import dayjs from 'dayjs'
import 'dayjs/locale/th'

import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

import {
  Bone,
  Clock,
  PawPrint,
  Pill,
  Pipette,
  Scissors,
  Stethoscope,
  Syringe,
  Tag,
  Trash2
} from 'lucide-react-native'

const SCREEN_WIDTH = Dimensions.get('window').width
const SWIPE_THRESHOLD = -100

interface ReminderCardProps {
  reminder: IReminder
  onDelete?: (id: string) => void
  isDeleting?: boolean
  canDelete?: boolean
  onPress?: (id: string) => void
  onToggleStatus?: (id: string, currentStatus: string) => void
  isTempDone?: boolean
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
  // CONST
  // ------------------
  const {
    reminder,
    onDelete,
    isDeleting = false,
    canDelete = true,
    onPress,
    onToggleStatus,
    isTempDone = false
  } = props
  const date = dayjs(reminder.reminderDate).locale('th')
  const buddhistYear = date.year() + 543

  const formattedDate = date.format(`DD/MM/${buddhistYear}`)
  const formattedTime = reminder?.reminderTime
    ? reminder.reminderTime.substring(0, 5)
    : ''

  const isDone = reminder?.reminderStatus === 'done' || isTempDone
  const categoryInfo = getCategoryInfo(reminder?.categoryId || 'Feeding')
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
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canDelete) return false
        return Math.abs(gestureState.dx) > 10
      },
      onPanResponderMove: (_, gestureState) => {
        if (!canDelete) return

        const currentValue = swipePosition.current

        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx)
        } else if (gestureState.dx > 0 && currentValue < 0) {
          const newValue = currentValue + gestureState.dx
          translateX.setValue(Math.min(0, newValue))
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canDelete) return

        const currentValue = swipePosition.current

        if (currentValue < 0) {
          if (gestureState.dx > 30 || currentValue > -50) {
            closeDeleteButton()
          } else {
            openDeleteButton()
          }
        } else {
          if (gestureState.dx < SWIPE_THRESHOLD) {
            openDeleteButton()
          } else {
            closeDeleteButton()
          }
        }
      }
    })
  ).current

  // ------------------
  // HANDLERS
  // ------------------
  const openDeleteButton = () => {
    Animated.spring(translateX, {
      toValue: -100,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start()
  }

  const closeDeleteButton = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start()
  }

  const handleDelete = () => {
    if (isDeleting) return

    closeDeleteButton()

    if (onDelete) {
      onDelete(reminder.id)
    }
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

  const handleInfoPress = () => {
    closeDeleteButton()
    if (onPress) {
      onPress(reminder.id)
    }
  }

  const handleToggleStatus = () => {
    if (isDone || !onToggleStatus) return
    onToggleStatus(reminder.id, reminder.reminderStatus)
  }

  // ------------------
  // RENDER
  // ------------------
  return (
    <View style={styles.container}>
      {/* Delete Button Background - Only show if can delete */}
      {canDelete && (
        <View style={styles.deleteButtonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
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
              reminder?.reminderStatus === 'overdue' ? '#BF1737' : '#88BEDD'
          }
        ]}
        {...(canDelete ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleCardPress}
          style={styles.cardTouchable}
        >
          {/* Left side - Checkbox circle */}
          <TouchableOpacity
            style={styles.leftSection}
            onPress={handleToggleStatus}
            disabled={isDone}
          >
            <View style={[styles.checkbox, isDone && styles.checkboxCompleted]}>
              {isDone && <View style={styles.checkboxInner} />}
            </View>
          </TouchableOpacity>

          {/* Middle section - Content */}
          <View style={styles.middleSection}>
            <Text
              style={[
                styles.reminderTitle,
                reminder?.reminderStatus === 'overdue' &&
                  styles.overdueTitleText
              ]}
            >
              {reminder?.reminderName}
            </Text>

            <View style={styles.infoRow}>
              <PawPrint size={16} color="#2E759E" fill="#2E759E" />
              <Text style={styles.petNameText}>
                {reminder?.pet_name || '-'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Clock
                size={16}
                color={
                  reminder?.reminderStatus === 'overdue' ? '#BF1737' : '#2E759E'
                }
              />
              <Text
                style={[
                  styles.dateTimeText,
                  reminder?.reminderStatus === 'overdue' && styles.overdueText
                ]}
              >
                {formattedTime
                  ? `${formattedDate}, ${formattedTime} น.`
                  : formattedDate}
              </Text>
            </View>
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
    fontWeight: '600',
    fontFamily: 'Prompt_500Medium'
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#5FA7D1',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxCompleted: {
    borderColor: '#5FA7D1'
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 9,
    backgroundColor: '#5FA7D1'
  },
  middleSection: {
    flex: 1,
    gap: 2
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
    fontWeight: '600',
    fontFamily: 'Prompt_400Regular'
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  overdueTitleText: {
    color: '#BF1737'
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
    fontWeight: '600'
  },
  infoButton: {
    padding: 4
  }
})
