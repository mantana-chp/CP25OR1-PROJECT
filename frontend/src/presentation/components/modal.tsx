import React, { ReactNode } from 'react'
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from 'react-native'
import Button from './button'
import { AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react-native'
import { colors } from '@/constants/design-system'

type ModalVariant = 'default' | 'confirmation'
type ModalIcon = 'trash' | 'warning' | 'info' | 'success'

interface BaseModalProps {
  visible: boolean
  onClose: () => void
  children?: ReactNode
  variant?: ModalVariant
  title?: string
  icon?: ModalIcon | ReactNode
  maxWidth?: number
  containerStyle?: ViewStyle
}

interface ConfirmationModalProps extends BaseModalProps {
  variant: 'confirmation'
  message: React.ReactNode
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

const ICON_CONFIG: Record<
  ModalIcon,
  { bg: string; color: string; node: ReactNode }
> = {
  trash: {
    bg: colors.danger.light,
    color: colors.danger.DEFAULT,
    node: <Trash2 size={28} color={colors.danger.DEFAULT} strokeWidth={2} />
  },
  warning: {
    bg: colors.warning.light,
    color: colors.warning.DEFAULT,
    node: (
      <AlertTriangle size={28} color={colors.warning.DEFAULT} strokeWidth={2} />
    )
  },
  info: {
    bg: colors.info.light,
    color: colors.info.DEFAULT,
    node: <Info size={28} color={colors.info.DEFAULT} strokeWidth={2} />
  },
  success: {
    bg: colors.success.light,
    color: colors.success.DEFAULT,
    node: (
      <CheckCircle size={28} color={colors.success.DEFAULT} strokeWidth={2} />
    )
  }
}

function ModalIconView({ icon }: { icon: ModalIcon | ReactNode }) {
  if (typeof icon === 'string' && icon in ICON_CONFIG) {
    const cfg = ICON_CONFIG[icon as ModalIcon]
    return (
      <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
        {cfg.node}
      </View>
    )
  }
  // Custom ReactNode — wrap in a neutral circle
  return (
    <View style={[styles.iconCircle, { backgroundColor: colors.gray[100] }]}>
      {icon as ReactNode}
    </View>
  )
}

export default function Modal(props: ModalProps) {
  const {
    visible,
    onClose,
    variant = 'default',
    title,
    icon,
    maxWidth = 360,
    containerStyle
  } = props

  const renderContent = () => {
    if (variant === 'confirmation') {
      const {
        message,
        confirmText = 'ยืนยัน',
        cancelText = 'ยกเลิก',
        onConfirm,
        confirmVariant = icon === 'trash' ? 'error' : 'base',
        isLoading = false
      } = props as ConfirmationModalProps

      return (
        <>
          {icon && <ModalIconView icon={icon} />}
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
        {icon && <ModalIconView icon={icon} />}
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
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: colors.primary.DEFAULT,
    textAlign: 'center',
    marginBottom: 4
  },
  message: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12
  },
  buttonHalf: {
    flex: 1
  }
})
