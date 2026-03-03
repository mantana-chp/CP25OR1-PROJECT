import React, { ReactNode } from 'react'
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'
import Button from './button'

type ModalVariant = 'default' | 'confirmation'

interface BaseModalProps {
  visible: boolean
  onClose: () => void
  children?: ReactNode
  variant?: ModalVariant
  title?: string
  icon?: string
  maxWidth?: number
  containerStyle?: ViewStyle
}

interface ConfirmationModalProps extends BaseModalProps {
  variant: 'confirmation'
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  confirmVariant?: 'base' | 'success' | 'error'
  isLoading?: boolean
}

interface DefaultModalProps extends BaseModalProps {
  variant?: 'default'
  children: ReactNode
}

type ModalProps = ConfirmationModalProps | DefaultModalProps

export default function Modal(props: ModalProps) {
  const {
    visible,
    onClose,
    variant = 'default',
    title,
    icon,
    maxWidth = 360,
    containerStyle,
  } = props

  const renderContent = () => {
    if (variant === 'confirmation') {
      const {
        message,
        confirmText = 'ยืนยัน',
        cancelText = 'ยกเลิก',
        onConfirm,
        confirmVariant = 'base',
        isLoading = false,
      } = props as ConfirmationModalProps

      return (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          {title && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonContainer}>
            <Button
              title={cancelText}
              onPress={onClose}
              variant="ghost"
              disabled={isLoading}
              style={styles.buttonHalf}
            />
            <Button
              title={confirmText}
              onPress={onConfirm}
              variant={confirmVariant}
              loading={isLoading}
              style={styles.buttonHalf}
            />
          </View>
        </>
      )
    }

    return (
      <>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        {title && <Text style={styles.title}>{title}</Text>}
        {(props as DefaultModalProps).children}
      </>
    )
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { maxWidth }, containerStyle]}
          onPress={(e) => e.stopPropagation()}
        >
          {renderContent()}
        </Pressable>
      </Pressable>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
})
