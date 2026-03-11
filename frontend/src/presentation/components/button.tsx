import { colors } from '@/constants/design-system'
import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle
} from 'react-native'

type ButtonVariant = 'base' | 'success' | 'error' | 'ghost'
type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export default function Button({
  title,
  onPress,
  variant = 'base',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle
}: ButtonProps) {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'base':
        return styles.baseButton
      case 'success':
        return styles.successButton
      case 'error':
        return styles.errorButton
      case 'ghost':
        return styles.ghostButton
      default:
        return styles.baseButton
    }
  }

  const getVariantTextStyle = (): TextStyle => {
    switch (variant) {
      case 'base':
        return styles.baseButtonText
      case 'success':
        return styles.successButtonText
      case 'error':
        return styles.errorButtonText
      case 'ghost':
        return styles.ghostButtonText
      default:
        return styles.baseButtonText
    }
  }

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return styles.smallButton
      case 'medium':
        return styles.mediumButton
      case 'large':
        return styles.largeButton
      default:
        return styles.mediumButton
    }
  }

  const getSizeTextStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return styles.smallButtonText
      case 'medium':
        return styles.mediumButtonText
      case 'large':
        return styles.largeButtonText
      default:
        return styles.mediumButtonText
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? '#225877' : '#fff'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            getVariantTextStyle(),
            getSizeTextStyle(),
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  buttonText: {
    fontFamily: 'Prompt_500Medium',
    textAlign: 'center'
  },
  fullWidth: {
    width: '100%'
  },
  disabled: {
    opacity: 0.5
  },
  baseButton: {
    backgroundColor: '#225877'
  },
  baseButtonText: {
    color: '#fff'
  },
  successButton: {
    backgroundColor: colors.success.DEFAULT
  },
  successButtonText: {
    color: '#fff'
  },
  errorButton: {
    backgroundColor: colors.danger.dark
  },
  errorButtonText: {
    color: '#fff'
  },
  ghostButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  ghostButtonText: {
    color: '#4b5563'
  },
  // Sizes
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  smallButtonText: {
    fontSize: 13
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  mediumButtonText: {
    fontSize: 14
  },
  largeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32
  },
  largeButtonText: {
    fontSize: 16
  }
})
