import { reminderService } from '@/src/utils/api/services/reminder_service'
import { useApi } from '@/src/utils/api/use_api'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CalendarDays, Clock, SearchX, X } from 'lucide-react-native'
import React, { useEffect } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import LoadingComponent from '../../components/loading_component'

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

export default function ReminderDetailModal() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const getReminderApi = useApi(reminderService.getReminderById, {
    showErrorAlert: true
  })

  const reminder = getReminderApi?.data?.data

  useEffect(() => {
    if (id) {
      getReminderApi.execute('acbfd0d5-8f76-4ef3-a045-30200e18f927')
    }
  }, [id])

  // Show not found message
  if (!id || (!getReminderApi.loading && !reminder)) {
    return (
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        {/* Close Button - Outside Modal */}
        <Pressable
          style={styles.closeButtonOutside}
          onPress={() => router.back()}
        >
          <X color="#FFFFFF" size={28} />
        </Pressable>

        <View style={styles.notFoundContent}>
          <View style={styles.notFoundContainer}>
            <SearchX color={'#225877'} size={64} />
            <Text style={styles.notFoundTitle}>ไม่พบการแจ้งเตือน</Text>
            <Text style={styles.notFoundMessage}>
              {!id
                ? 'ไม่พบรหัสการแจ้งเตือน'
                : 'นัดหมายนี้อาจถูกลบไปแล้ว หรือไม่มีอยู่ในระบบ'}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <Pressable
        style={styles.closeButtonOutside}
        onPress={() => router.back()}
      >
        <X color="#FFFFFF" size={28} />
      </Pressable>

      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>รายละเอียดการเตือนความจำ</Text>
        </View>

        {/* Form Card */}
        {getReminderApi.loading ? (
          <LoadingComponent />
        ) : (
          <View style={styles.formCard}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>หัวข้อ</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={reminder?.reminderName || ''}
                editable={false}
              />
            </View>

            {/* Date / Time Row */}
            <View style={styles.row}>
              {/* Date Button */}
              <Pressable
                style={[styles.pickerButton, styles.readOnlyInput]}
                disabled={true}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    reminder?.reminderStatus === 'overdue' && styles.overdueText
                  ]}
                >
                  {reminder?.reminderDate
                    ? formatDate(new Date(reminder.reminderDate))
                    : '-'}
                </Text>
                <Text style={styles.pickerButtonIcon}>
                  <CalendarDays color={'#A6A6A6'} />
                </Text>
              </Pressable>

              {/* Time Button */}
              <Pressable
                style={[styles.pickerButton, styles.readOnlyInput]}
                disabled={true}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    reminder?.reminderStatus === 'overdue' && styles.overdueText
                  ]}
                >
                  {reminder?.reminderTime
                    ? formatTime(parseApiTime(reminder.reminderTime))
                    : '-'}
                </Text>
                <Text style={styles.pickerButtonIcon}>
                  <Clock color={'#A6A6A6'} />
                </Text>
              </Pressable>
            </View>

            {/* Details Input */}
            <View>
              <TextInput
                style={[styles.input, styles.textarea, styles.readOnlyInput]}
                value={reminder?.description || '-'}
                multiline
                numberOfLines={4}
                editable={false}
              />
            </View>
          </View>
        )}
      </View>
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
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 20,
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonOutside: {
    position: 'absolute',
    bottom: '20%',
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
    padding: 16
  },
  inputGroup: {
    marginBottom: 16,
    gap: 4
  },
  inputLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    marginLeft: 4
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
    gap: 12,
    marginBottom: 16
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
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#111827'
  },
  pickerButtonIcon: {
    fontSize: 20
  },
  overdueText: {
    color: '#BF1737'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 20
  },
  notFoundIcon: {
    fontSize: 64,
    marginBottom: 16
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
