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
  onChange: (date: Date) => void
}

export default function DatePicker(props: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false)

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
    }

    if (event.type === 'set' && selectedDate) {
      props.onChange(selectedDate)
    } else if (event.type === 'dismissed') {
      setShowPicker(false)
    }
  }

  const handleOpen = () => {
    if (!props.disabled) {
      setShowPicker(true)
    }
  }

  const handleClose = () => {
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
            props.disabled && styles.pickerButtonDisabled,
            props.error && styles.pickerButtonError
          ]}
        >
          {props.value === undefined ? (
            <Text style={styles.placeholderText}>{props.placeholder}</Text>
          ) : (
            <Text
              style={[
                styles.pickerButtonText,
                props.disabled && styles.pickerButtonTextDisabled
              ]}
            >
              {formatDate(props.value)}
            </Text>
          )}

          <Text style={styles.pickerButtonIcon}>
            <CalendarDays color={'#A6A6A6'} />
          </Text>
        </Pressable>

        {props.error && <Text style={styles.errorText}>{props.error}</Text>}
      </View>

      {/* Android Picker */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={props.value || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
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
                value={props.value || new Date()}
                mode="date"
                display="inline"
                onChange={handleChange}
                textColor="#5FA7D1"
                style={styles.picker}
                locale="th-TH"
              />

              <View style={styles.modalFooter}>
                <Button
                  title="เสร็จสิ้น"
                  onPress={handleClose}
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
    minHeight: 48,
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
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
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
