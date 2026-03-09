import React, { useState } from 'react'

import DateTimePicker, {
  DateTimePickerEvent
} from '@react-native-community/datetimepicker'
import { CalendarDays, X } from 'lucide-react-native'
import {
  Button,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'

interface DatePickerProps {
  title: string
  value: Date | undefined
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string | null
  small?: boolean
  maximumDate?: Date
  minimumDate?: Date
  onChange: (date: Date) => void
}

export default function DatePicker(props: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [tempDate, setTempDate] = useState<Date | undefined>(props.value)

  const formatDate = (date: Date | undefined) => {
    if (!date) return ''
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false)

      if (event.type === 'set' && selectedDate) {
        setTempDate(selectedDate)
        props.onChange(selectedDate)
      } else if (event.type === 'dismissed') {
        setTempDate(props.value)
      }
    } else {
      // iOS handling
      if (event.type === 'set' && selectedDate) {
        setTempDate(selectedDate)
      } else if (event.type === 'dismissed') {
        setShowPicker(false)
        setTempDate(props.value)
      }
    }
  }

  const handleOpen = () => {
    if (!props.disabled) {
      const initialDate = props.value || new Date()
      setTempDate(initialDate)

      if (!props.value) {
        props.onChange(initialDate)
      }
      setShowPicker(true)
    }
  }

  const handleClose = () => {
    setShowPicker(false)
    setTempDate(props.value)
  }

  const handleConfirm = () => {
    if (tempDate) {
      props.onChange(tempDate)
    }
    setShowPicker(false)
  }

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {props.title}{' '}
          {props.required && <Text style={styles.required}>*</Text>}
        </Text>

        <Pressable
          onPress={handleOpen}
          disabled={props.disabled}
          style={[
            styles.pickerButton,
            props.small && styles.pickerButtonSmall,
            props.disabled && styles.pickerButtonDisabled,
            props.error && styles.pickerButtonError
          ]}
        >
          {props.value === undefined ? (
            <Text
              style={[
                styles.placeholderText,
                props.small && styles.pickerButtonTextSmall
              ]}
            >
              {props.placeholder}
            </Text>
          ) : (
            <Text
              style={[
                styles.pickerButtonText,
                props.small && styles.pickerButtonTextSmall,
                props.disabled && styles.pickerButtonTextDisabled
              ]}
            >
              {formatDate(props.value)}
            </Text>
          )}

          <Text
            style={[
              styles.pickerButtonIcon,
              props.small && styles.pickerButtonIconSmall
            ]}
          >
            <CalendarDays
              color={'#9ca3af'}
              size={props.small ? 16 : 20}
              strokeWidth={1.5}
            />
          </Text>
        </Pressable>

        {props.error && <Text style={styles.errorText}>{props.error}</Text>}
      </View>

      {/* Android Picker */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={props.maximumDate}
          minimumDate={props.minimumDate}
        />
      )}

      {/* iOS Picker Modal */}
      {showPicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent={true} animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={handleClose}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{props.title}</Text>
                <Pressable onPress={handleClose}>
                  <Text style={styles.closeButton}>
                    <X color={'#a6a6a6'} />
                  </Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={tempDate || new Date()}
                mode="date"
                display="inline"
                onChange={handleChange}
                textColor="#5FA7D1"
                style={styles.picker}
                locale="th-TH"
                maximumDate={props.maximumDate}
                minimumDate={props.minimumDate}
              />

              <View style={styles.modalFooter}>
                <Button
                  title="เสร็จสิ้น"
                  onPress={handleConfirm}
                  color="#5FA7D1"
                />
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
    gap: 4
  },
  inputLabel: {
    color: '#225877',
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    marginLeft: 4
  },
  required: {
    color: '#BF1737'
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 32,
    backgroundColor: '#fff'
  },
  pickerButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb'
  },
  pickerButtonError: {
    borderColor: '#BF1737'
  },
  placeholderText: {
    fontFamily: 'Prompt_400Regular',
    color: '#A6A6A6'
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  pickerButtonTextDisabled: {
    color: '#9ca3af'
  },
  pickerButtonIcon: {
    fontSize: 20
  },
  pickerButtonSmall: {
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  pickerButtonTextSmall: {
    fontSize: 13
  },
  pickerButtonIconSmall: {
    fontSize: 16
  },
  errorText: {
    color: '#BF1737',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    marginLeft: 4,
    marginTop: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#225877',
    fontFamily: 'Prompt_500Medium'
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    paddingHorizontal: 8
  },
  picker: {
    height: 200,
    width: '100%',
    alignSelf: 'center'
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12
  }
})
