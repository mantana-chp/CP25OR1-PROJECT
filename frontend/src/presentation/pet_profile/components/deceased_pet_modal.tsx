import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

interface DeceasedPetModalProps {
  visible: boolean
  petName: string
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export default function DeceasedPetModal({
  visible,
  petName,
  onClose,
  onConfirm,
  isLoading = false
}: DeceasedPetModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.icon}>🕊️</Text>
          <Text style={styles.title}>ทำเครื่องหมายว่าเสียชีวิต</Text>
          <Text style={styles.message}>
            {`คุณแน่ใจหรือไม่ว่า "${petName}" เสียชีวิตแล้ว?\n\nการนัดหมายที่เกี่ยวข้องจะถูกปิด และโปรไฟล์จะถูกย้ายไปยัง "สัตว์เลี้ยงในความทรงจำ"`}
          </Text>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.confirmButton,
                isLoading && styles.disabledButton
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
              </Text>
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
  icon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8
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
    paddingVertical: 12,
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
  confirmButton: {
    backgroundColor: '#6b7280'
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  },
  disabledButton: {
    opacity: 0.6
  }
})
