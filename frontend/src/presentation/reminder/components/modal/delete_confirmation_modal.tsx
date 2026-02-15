import React from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface DeleteConfirmationModalProps {
  visible: boolean
  reminderName: string
  totalCount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmationModal({
  visible,
  reminderName,
  totalCount,
  onConfirm,
  onCancel
}: DeleteConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>ยืนยันการลบ</Text>
          <Text style={styles.modalMessage}>
            การลบเตือนความจำนี้จะลบเตือนความจำทั้งหมดใน{' '}
            <Text style={styles.modalBold}>{reminderName}</Text> ({totalCount}{' '}
            รายการ)
          </Text>
          <Text style={styles.modalSubMessage}>คุณแน่ใจหรือไม่?</Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButtonModal]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonText}>ลบทั้งหมด</Text>
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
    color: '#ef4444'
  },
  modalSubMessage: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#6b7280',
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  modalButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center'
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
  },
  deleteButtonModal: {
    backgroundColor: '#ef4444'
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_700Bold',
    color: '#fff'
  }
})
