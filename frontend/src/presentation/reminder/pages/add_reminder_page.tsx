import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import React from 'react'
import {
  Alert,
  Button,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { addReminder } from '../../../data/reminder.api'
import { IAddReminder } from '../../../domain/add_reminder.domain'
import Header from '../../components/header_component'

const formatDate = (date: Date) => {
  return date.toLocaleDateString('th-TH')
}

const formatTime = (time: Date) => {
  return time.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Formats date to YYYY-MM-DD
const formatApiDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

// Formats time to HH:MM:SS
const formatApiTime = (time: Date): string => {
  // .toTimeString() gives "HH:MM:SS GMT+0700 (...)"
  return time.toTimeString().split(' ')[0]
}

export default function AddReminderPage() {
  const router = useRouter()

  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [date, setDate] = React.useState(new Date())
  const [time, setTime] = React.useState(new Date())

  const [showDatePicker, setShowDatePicker] = React.useState(false)
  const [showTimePicker, setShowTimePicker] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleAddReminder = async () => {
    if (!title.trim()) {
      Alert.alert('เกิดข้อผิดพลาด', 'กรุณาใส่หัวข้อ')
      return
    }

    setIsSubmitting(true)

    const reminderData: IAddReminder = {
      reminderName: title,
      description: description,
      reminderDate: formatApiDate(date),
      reminderTime: formatApiTime(time),
    }

    try {
      const newReminder = await addReminder(reminderData)

      if (newReminder) {
        console.log('Successfully added reminder:', newReminder)
        router.back()
      } else {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          'ไม่สามารถเพิ่มการแจ้งเตือนได้ กรุณาลองใหม่อีกครั้ง'
        )
      }
    } catch (error) {
      console.error('An unexpected error occurred:', error)
      Alert.alert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดที่ไม่คาดคิด')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
    if (event.type === 'set' || Platform.OS === 'ios') {
      setDate(currentDate)
    } else {
      setShowDatePicker(false)
    }
  }

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    const currentTime = selectedTime || time
    if (Platform.OS === 'android') {
      setShowTimePicker(false)
    }
    if (event.type === 'set' || Platform.OS === 'ios') {
      setTime(currentTime)
    } else {
      setShowTimePicker(false)
    }
  }

  const closeIosPicker = () => {
    setShowDatePicker(false)
    setShowTimePicker(false)
  }

  const handleOpenDatePicker = () => {
    setShowDatePicker(true)
  }

  const handleOpenTimePicker = () => {
    setShowTimePicker(true)
  }

  return (
    <View style={styles.screen}>
      <View style={styles.safeArea}>
        <Header title='เพิ่มการเตือนความจำ' goBack={!isSubmitting} />

        {/* --- Form Card --- */}
        <View style={styles.formCard}>
          {/* Cancel / Add Row */}
          <View style={styles.cardHeader}>
            <Pressable onPress={() => router.back()} disabled={isSubmitting}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </Pressable>
            <Pressable onPress={handleAddReminder} disabled={isSubmitting}>
              <Text
                style={[styles.addText, isSubmitting && styles.submittingText]}
              >
                {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
              </Text>
            </Pressable>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>หัวข้อ</Text>
            <TextInput
              style={styles.input}
              placeholder='หัวข้อการเตือนความจำ'
              value={title}
              onChangeText={setTitle}
              editable={!isSubmitting}
            />
          </View>

          {/* Date / Time Row */}
          <View style={styles.row}>
            {/* Date Button */}
            <Pressable
              onPress={handleOpenDatePicker}
              style={styles.pickerButton}
              disabled={isSubmitting}
            >
              <Text style={styles.pickerButtonText}>{formatDate(date)}</Text>
              <Text style={styles.pickerButtonIcon}>📅</Text>
            </Pressable>

            {/* Time Button */}
            <Pressable
              onPress={handleOpenTimePicker}
              style={styles.pickerButton}
              disabled={isSubmitting}
            >
              <Text style={styles.pickerButtonText}>{formatTime(time)}</Text>
              <Text style={styles.pickerButtonIcon}>⏰</Text>
            </Pressable>
          </View>

          {/* Details Input */}
          <View>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder='รายละเอียด'
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              editable={!isSubmitting}
            />
          </View>
        </View>
        {/* --- Form Card --- */}
      </View>

      {/* --- PICKER COMPONENTS --- */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode='date'
          display='default'
          onChange={onDateChange}
        />
      )}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={time}
          mode='time'
          display='default'
          onChange={onTimeChange}
        />
      )}
      <Modal
        visible={(showDatePicker || showTimePicker) && Platform.OS === 'ios'}
        transparent={true}
        animationType='slide'
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode='date'
                display='inline'
                onChange={onDateChange}
                textColor='#0ea5e9'
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode='time'
                display='spinner'
                onChange={onTimeChange}
                textColor='#0ea5e9'
              />
            )}
            <Button title='Done' onPress={closeIosPicker} />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  formCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelText: {
    color: '#4b5563',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    fontWeight: 'bold',
  },
  addText: {
    color: '#2E759E',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    fontWeight: 'bold',
  },
  submittingText: {
    color: '#6b7280',
  },

  inputGroup: {
    marginBottom: 16,
    gap: 4,
  },
  inputLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    marginLeft: 4,
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
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    height: 48,
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#374151',
  },
  pickerButtonIcon: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
})
