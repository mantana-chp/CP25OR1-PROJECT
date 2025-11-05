import { DropdownOption } from '@/src/domain/common.domain'
import { ChevronDown } from 'lucide-react-native'
import React, { useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface DropdownProps {
  title: string
  value: string
  placeholder: string
  required: boolean
  options: DropdownOption[]
  disable?: boolean
  error?: string | null
  onSelect: (value: string) => void
}

export default function Dropdown(props: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const selectedOption = props.options.find((opt) => opt.value === props.value)
  const displayText = selectedOption ? selectedOption.label : props.placeholder

  const handleSelect = (value: string) => {
    props.onSelect(value)
    setIsOpen(false)
    setIsFocused(false)
  }

  const handleOpen = () => {
    setIsOpen(true)
    setIsFocused(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsFocused(false)
  }

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {props.title}{' '}
          {props.required && <Text style={styles.required}>*</Text>}
        </Text>

        <TouchableOpacity
          style={[styles.input, isFocused && styles.inputFocused]}
          onPress={handleOpen}
          disabled={props.disable}
        >
          <Text
            style={[
              styles.inputText,
              !selectedOption && styles.placeholderText
            ]}
          >
            {displayText}
          </Text>
          <ChevronDown
            size={20}
            color={props.disable ? '#9ca3af' : '#225877'}
            style={styles.icon}
          />
        </TouchableOpacity>

        {props.error && <Text style={styles.errorText}>{props.error}</Text>}
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => handleClose()}
      >
        <Pressable style={styles.modalOverlay} onPress={() => handleClose()}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{props.title}</Text>
              <TouchableOpacity onPress={() => handleClose()}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={props.options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === props.value && styles.optionSelected
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === props.value && styles.optionTextSelected
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === props.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff'
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb'
  },
  inputError: {
    borderColor: '#BF1737'
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  inputFocused: {
    borderColor: '#5FA7D1',
    borderWidth: 2,
    shadowColor: '#5FA7D1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4 // For Android
  },
  placeholderText: {
    color: '#9ca3af'
  },
  icon: {
    marginLeft: 8
  },
  required: {
    color: '#BF1737'
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
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
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
    fontFamily: 'Prompt_600SemiBold'
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    paddingHorizontal: 8
  },
  optionsList: {
    maxHeight: 400
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  optionSelected: {
    backgroundColor: '#f0f9ff'
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    flex: 1
  },
  optionTextSelected: {
    fontFamily: 'Prompt_600SemiBold',
    color: '#5FA7D1'
  },
  checkmark: {
    fontSize: 20,
    color: '#5FA7D1',
    fontWeight: 'bold'
  }
})
