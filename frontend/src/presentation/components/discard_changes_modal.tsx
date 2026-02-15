import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

type ModalVariant = 'reminder' | 'petProfile' | 'default'

const VARIANT_DEFAULTS: Record<
  ModalVariant,
  { title: string; message: string; cancelText: string; discardText: string }
> = {
  reminder: {
    title: 'ยกเลิกการเปลี่ยนแปลง?',
    message:
      'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการยกเลิกการเปลี่ยนแปลงหรือไม่?',
    cancelText: 'แก้ไขต่อ',
    discardText: 'ยกเลิก'
  },
  petProfile: {
    title: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
    message: 'คุณต้องการยกเลิกการเปลี่ยนแปลงและย้อนกลับหรือไม่?',
    cancelText: 'อยู่ต่อ',
    discardText: 'ย้อนกลับ'
  },
  default: {
    title: 'ยกเลิกการเปลี่ยนแปลง?',
    message:
      'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการยกเลิกการเปลี่ยนแปลงหรือไม่?',
    cancelText: 'ยกเลิก',
    discardText: 'ตกลง'
  }
}

interface DiscardChangesModalProps {
  visible: boolean
  onClose: () => void
  onDiscard: () => void
  variant?: ModalVariant
  title?: string
  message?: string
  cancelText?: string
  discardText?: string
  dismissOnOverlayPress?: boolean
}

export default function DiscardChangesModal({
  visible,
  onClose,
  onDiscard,
  variant,
  title,
  message,
  cancelText,
  discardText,
  dismissOnOverlayPress = true
}: DiscardChangesModalProps) {
  const defaults = VARIANT_DEFAULTS[variant || 'default']

  const displayTitle = title ?? defaults.title
  const displayMessage = message ?? defaults.message
  const displayCancelText = cancelText ?? defaults.cancelText
  const displayDiscardText = discardText ?? defaults.discardText

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={dismissOnOverlayPress ? onClose : undefined}
      >
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.message}>{displayMessage}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{displayCancelText}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.discardButton]}
              onPress={onDiscard}
            >
              <Text style={styles.discardButtonText}>{displayDiscardText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    width: '85%',
    maxWidth: 340
  },
  title: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 12
  },
  message: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  buttons: {
    flexDirection: 'row',
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 40,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#4b5563'
  },
  discardButton: {
    backgroundColor: '#BF1737'
  },
  discardButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  }
})
