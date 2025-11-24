import { getCategoryInfo } from '@/src/domain/reminder.domain'
import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import {
  Bone,
  CalendarDays,
  Clock,
  Pill,
  Pipette,
  Scissors,
  SearchX,
  Stethoscope,
  Syringe,
  Tag,
  X
} from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import LoadingComponent from '../../components/loading_component'
import OverdueAlert from '../components/overdue_alert'

const ICON_MAP: Record<string, any> = {
  Tag,
  Syringe,
  Stethoscope,
  Pill,
  Pipette,
  Scissors,
  Bone
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('th-TH')
}

const formatTime = (time: Date) => {
  return time.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const parseApiTime = (timeString: string): Date => {
  if (!timeString) return new Date()

  const [hours, minutes, seconds] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, seconds || 0)
  return date
}

interface ReminderDetailModalProps {
  id: string
  onClose: () => void
}

export default function ReminderDetailModal({
  id,
  onClose
}: ReminderDetailModalProps) {
  const [modalLayout, setModalLayout] = useState({ y: 0, height: 0 })

  const getReminderApi = useApi(reminderService.getReminderById, {
    showErrorAlert: true
  })

  const reminder = getReminderApi?.data?.data
  const isOverdue = reminder?.reminderStatus === 'overdue'
  const categoryInfo = reminder?.categoryName
    ? getCategoryInfo(reminder.categoryName)
    : null
  const CategoryIcon = categoryInfo ? ICON_MAP[categoryInfo.icon] : null

  useEffect(() => {
    if (id) {
      getReminderApi.execute(id)
    }
  }, [id])

  // Show not found message
  if (!id || (!getReminderApi.loading && !reminder)) {
    return (
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={styles.notFoundContent}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout
            setModalLayout({ y, height })
          }}
        >
          <View style={styles.notFoundContainer}>
            <SearchX color={'#225877'} size={64} />
            <Text style={styles.notFoundTitle}>ไม่พบการแจ้งเตือน</Text>
            <Text style={styles.notFoundMessage}>
              {!id
                ? 'ไม่พบรหัสการแจ้งเตือน'
                : 'เตือนความจำนี้อาจถูกลบไปแล้ว หรือไม่มีอยู่ในระบบ'}
            </Text>
          </View>
        </View>

        {/* Close Button - Dynamically positioned below modal */}
        {modalLayout.height > 0 && (
          <Pressable
            style={[
              styles.closeButtonOutside,
              { top: modalLayout.y + modalLayout.height + 20 }
            ]}
            onPress={onClose}
          >
            <X color="#FFFFFF" size={28} />
          </Pressable>
        )}
      </View>
    )
  }

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View
        style={styles.modalContent}
        onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout
          setModalLayout({ y, height })
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>รายละเอียดเตือนความจำ</Text>
        </View>

        {/* Form Card */}
        {getReminderApi.loading ? (
          <LoadingComponent />
        ) : (
          <View style={styles.formCard}>
            {isOverdue && <OverdueAlert />}

            <Text style={styles.reminderTitle}>
              {reminder?.reminderName || ''}
            </Text>

            <View style={styles.row}>
              <Pressable
                style={[
                  styles.pickerButton,
                  styles.readOnlyInput,
                  isOverdue && styles.overdueInputBorder
                ]}
                disabled={true}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    isOverdue && styles.overdueText
                  ]}
                >
                  {reminder?.reminderDate
                    ? formatDate(new Date(reminder.reminderDate))
                    : '-'}
                </Text>
                <Text style={styles.pickerButtonIcon}>
                  <CalendarDays color={isOverdue ? '#DC2626' : '#A6A6A6'} />
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.pickerButton,
                  styles.readOnlyInput,
                  isOverdue && styles.overdueInputBorder
                ]}
                disabled={true}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    isOverdue && styles.overdueText
                  ]}
                >
                  {reminder?.reminderTime
                    ? formatTime(parseApiTime(reminder.reminderTime))
                    : '-'}
                </Text>
                <Text style={styles.pickerButtonIcon}>
                  <Clock color={isOverdue ? '#DC2626' : '#A6A6A6'} />
                </Text>
              </Pressable>
            </View>

            <View>
              <TextInput
                style={[styles.input, styles.textarea, styles.readOnlyInput]}
                value={reminder?.description || '-'}
                multiline
                numberOfLines={4}
                editable={false}
              />
            </View>

            {categoryInfo && (
              <View
                style={[
                  styles.categoryTag,
                  {
                    backgroundColor: categoryInfo.color + '20',
                    borderColor: categoryInfo.color
                  }
                ]}
              >
                {CategoryIcon && (
                  <CategoryIcon size={14} color={categoryInfo.color} />
                )}
                <Text
                  style={[styles.categoryText, { color: categoryInfo.color }]}
                >
                  {categoryInfo.label}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Close Button - Dynamically positioned below modal */}
      {modalLayout.height > 0 && (
        <Pressable
          style={[
            styles.closeButtonOutside,
            { top: modalLayout.y + modalLayout.height + 20 }
          ]}
          onPress={onClose}
        >
          <X color="#FFFFFF" size={28} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  notFoundContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    paddingVertical: 40,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  notFoundContainer: {
    alignItems: 'center',
    gap: 16
  },
  closeButtonOutside: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -22 }],
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerTitle: {
    color: '#225877',
    fontSize: 20,
    fontFamily: 'Prompt_700Bold',
    textAlign: 'center'
  },
  formCard: {
    padding: 20,
    gap: 16
  },
  reminderTitle: {
    fontSize: 17,
    fontWeight: '500',
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    minHeight: 48,
    color: '#111827'
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    height: 48
  },
  overdueInputBorder: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2'
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  pickerButtonIcon: {
    fontSize: 20
  },
  overdueText: {
    color: '#DC2626',
    fontFamily: 'Prompt_500Medium'
  },
  notFoundTitle: {
    fontSize: 22,
    color: '#374151',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 4,
    textAlign: 'center'
  },
  notFoundMessage: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Prompt_400Regular',
    textAlign: 'center',
    lineHeight: 24
  },
  readOnlyInput: {
    backgroundColor: '#f3f4f6',
    color: '#374151'
  }
})
