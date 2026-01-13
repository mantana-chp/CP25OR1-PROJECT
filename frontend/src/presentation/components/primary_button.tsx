import React from 'react'
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native'

interface PrimaryButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
  isLoading?: boolean
  loadingText?: string
  style?: ViewStyle
  icon?: React.ReactNode
}

export default function PrimaryButton(props: PrimaryButtonProps) {
  const {
    title,
    onPress,
    disabled = false,
    isLoading = false,
    loadingText = 'กำลังโหลด...',
    style
  } = props

  const isDisabled = disabled || isLoading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: isDisabled ? '#A0C4D4' : '#5FA7D1',
          opacity: isDisabled ? 0.7 : 1
        },
        style
      ]}
    >
      {props.icon}
      <Text style={styles.buttonText}>{isLoading ? loadingText : title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 24
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Prompt_700Bold'
  }
})
