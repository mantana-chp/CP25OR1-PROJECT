import {
  borderRadius,
  colors,
  spacing,
  typography
} from '@/constants/design-system'
import React from 'react'
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native'

type ButtonVariant = 'base' | 'success' | 'error' | 'ghost'
type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export default function Button({
  title,
  onPress,
  variant = 'base',
  size = 'medium',
  icon,
  iconPosition = 'left',
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
          color={
            variant === 'ghost'
              ? colors.primary.DEFAULT
              : colors.background.secondary
          }
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <View style={styles.leftIcon}>{icon}</View>
          ) : null}

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

          {icon && iconPosition === 'right' ? (
            <View style={styles.rightIcon}>{icon}</View>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  buttonText: {
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center'
  },
  leftIcon: {
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rightIcon: {
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullWidth: {
    width: '100%'
  },
  disabled: {
    opacity: 0.5
  },
  baseButton: {
    backgroundColor: colors.primary.DEFAULT
  },
  baseButtonText: {
    color: colors.background.secondary
  },
  successButton: {
    backgroundColor: colors.success.DEFAULT
  },
  successButtonText: {
    color: colors.background.secondary
  },
  errorButton: {
    backgroundColor: colors.danger.dark
  },
  errorButtonText: {
    color: colors.background.secondary
  },
  ghostButton: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT
  },
  ghostButtonText: {
    color: colors.gray[600]
  },
  smallButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4]
  },
  smallButtonText: {
    fontSize: typography.fontSize.base
  },
  mediumButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6]
  },
  mediumButtonText: {
    fontSize: typography.fontSize.md
  },
  largeButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8]
  },
  largeButtonText: {
    fontSize: typography.fontSize.lg
  }
})
