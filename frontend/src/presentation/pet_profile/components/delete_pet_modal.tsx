import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

interface DeletePetModalProps {
  visible: boolean
  petName: string
  hasRelations: boolean
  onClose: () => void
  onDelete: () => void
  isLoading?: boolean
}

export default function DeletePetModal({
  visible,
  petName,
  hasRelations,
  onClose,
  onDelete,
  isLoading = false
}: DeletePetModalProps) {
  const title = hasRelations ? 'ยืนยันการลบสัตว์เลี้ยง?' : 'ลบสัตว์เลี้ยง?'

  const message = hasRelations
    ? `"${petName}" มีการนัดหมายหรือประวัติสุขภาพที่เกี่ยวข้อง\n\nข้อมูลจะถูกย้ายไปยัง "เพิ่งลบล่าสุด" และสามารถกู้คืนได้`
    : `คุณต้องการลบ "${petName}" หรือไม่?\n\nการดำเนินการนี้ไม่สามารถยกเลิกได้`

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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
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
                styles.deleteButton,
                isLoading && styles.disabledButton
              ]}
              onPress={onDelete}
              disabled={isLoading}
            >
              <Text style={styles.deleteButtonText}>
                {isLoading ? 'กำลังลบ...' : 'ลบ'}
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
  deleteButton: {
    backgroundColor: '#BF1737'
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  },
  disabledButton: {
    opacity: 0.6
  }
})
