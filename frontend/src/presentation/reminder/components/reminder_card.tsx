import { IReminder } from '@/src/domain/reminder.domain'
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

import { Clock, Info, PawPrint, Trash2 } from 'lucide-react-native'

const SCREEN_WIDTH = Dimensions.get('window').width
const SWIPE_THRESHOLD = -100

interface ReminderCardProps {
  reminder: IReminder
  onDelete?: (id: string) => void
  isDeleting?: boolean
  canDelete?: boolean
  onPress?: (id: string) => void
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
    onPress
  } = props
  const date = dayjs(reminder.reminderDate).locale('th')
  const buddhistYear = date.year() + 543
  const formattedDate = date.format(`DD/MM/${buddhistYear}, HH:mm น.`)

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
            transform: [{ translateX }]
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
          <View style={styles.leftSection}>
            <View
              style={[
                styles.checkbox,
                reminder?.reminderStatus === 'done' && styles.checkboxCompleted
              ]}
            >
              {reminder?.reminderStatus === 'done' && (
                <View style={styles.checkboxInner} />
              )}
            </View>
          </View>

          {/* Middle section - Content */}
          <View style={styles.middleSection}>
            <Text style={styles.reminderTitle}>{reminder?.reminderName}</Text>

            <View style={styles.infoRow}>
              <PawPrint size={16} color="#2E759E" fill="#2E759E" />
              <Text style={styles.petNameText}>{reminder?.petName || '-'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Clock size={16} color="#2E759E" />
              <Text style={styles.dateTimeText}>{formattedDate}</Text>
            </View>
          </View>

          {/* Right side - Info button */}
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => handleInfoPress()}
          >
            <Info size={24} color="#88BEDD" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
    fontFamily: 'Prompt_600SemiBold'
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
    borderLeftWidth: 6,
    borderLeftColor: '#88BEDD'
  },
  cardTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  leftSection: {
    marginRight: 12
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#5FA7D1',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxCompleted: {
    borderColor: '#5FA7D1',
    backgroundColor: '#5FA7D1'
  },
  checkboxInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  middleSection: {
    flex: 1,
    gap: 2
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  petNameText: {
    fontSize: 14,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  dateTimeText: {
    fontSize: 14,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  },
  infoButton: {
    padding: 4
  }
})
