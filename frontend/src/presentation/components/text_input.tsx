import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

interface TextInputProps {
  title: string
  value: string
  placeholder: string
  required: boolean
  disable?: boolean
  error?: string | null
  onChangeText: (text: string) => void
}

export default function InputText(props: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {props.title}{' '}
          {props.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused // Apply when focused
          ]}
          placeholder={props.placeholder}
          value={props.value}
          onChangeText={props.onChangeText}
          // editable={!props.required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <Text style={{ color: '#BF1737', marginTop: 4 }}>{props.error}</Text>
      </View>
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
    backgroundColor: '#ffffff'
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
  required: {
    color: '#BF1737'
  }
})
