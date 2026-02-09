import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface DeleteSeriesModalProps {
  visible: boolean
  onClose: () => void
  onDeleteThisOnly: () => void
  onDeleteAll: () => void
  reminderName: string
}

export default function DeleteSeriesModal({
  visible,
  onClose,
  onDeleteThisOnly,
  onDeleteAll,
  reminderName
}: DeleteSeriesModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>ลบเตือนความจำที่ทำซ้ำ</Text>
          <Text style={styles.modalMessage}>
            คุณต้องการลบเตือนความจำ{' '}
            <Text style={styles.modalBold}>{reminderName}</Text> อย่างไร?
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={onDeleteThisOnly}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonText}>
                ลบเฉพาะเตือนความจำครั้งนี้
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={onDeleteAll}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonText}>ลบเตือนความจำทั้งหมด</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    textAlign: 'center',
    lineHeight: 24
  },
  modalBold: {
    fontFamily: 'Prompt_700Bold',
    color: '#225877'
  },
  modalButtons: {
    gap: 12,
    marginTop: 8
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  deleteButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#ef4444'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#4b5563'
  }
})
