import { Edit, Trash2 } from 'lucide-react-native'
import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

interface SeriesActionModalProps {
  visible: boolean
  onClose: () => void
  actionType: 'edit' | 'delete'
  reminderName: string
  onThisOnly: () => void
  onAllFuture: () => void
}

export default function SeriesActionModal({
  visible,
  onClose,
  actionType,
  reminderName,
  onThisOnly,
  onAllFuture
}: SeriesActionModalProps) {
  const isEdit = actionType === 'edit'
  const Icon = isEdit ? Edit : Trash2

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: isEdit ? '#E8F4F8' : '#FEE2E2' }
              ]}
            >
              <Icon
                size={32}
                color={isEdit ? '#5FA7D1' : '#EF4444'}
                strokeWidth={2}
              />
            </View>
          </View>

          <Text style={styles.modalTitle}>
            {isEdit
              ? 'แก้ไขการเตือนความจำที่ทำซ้ำ'
              : 'ลบการเตือนความจำที่ทำซ้ำ'}
          </Text>

          <Text style={styles.modalMessage}>
            <Text style={styles.reminderName}>"{reminderName}"</Text>
            {'\n'}
            เป็นการเตือนความจำที่ทำซ้ำ คุณต้องการ{isEdit ? 'แก้ไข' : 'ลบ'}:
          </Text>

          <View style={styles.optionsContainer}>
            <Pressable style={styles.optionButton} onPress={onThisOnly}>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {isEdit ? 'แก้ไขเฉพาะครั้งนี้' : 'ลบเฉพาะครั้งนี้'}
                </Text>
                <Text style={styles.optionDescription}>
                  {isEdit
                    ? 'การเตือนความจำครั้งอื่นๆ จะไม่เปลี่ยนแปลง'
                    : 'การเตือนความจำครั้งอื่นๆ จะยังคงอยู่'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.optionButton,
                !isEdit && styles.optionButtonDanger
              ]}
              onPress={onAllFuture}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionTitle,
                    !isEdit && styles.optionTitleDanger
                  ]}
                >
                  {isEdit
                    ? 'แก้ไขครั้งนี้และครั้งถัดไปทั้งหมด'
                    : 'ลบครั้งนี้และครั้งถัดไปทั้งหมด'}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    !isEdit && styles.optionDescriptionDanger
                  ]}
                >
                  {isEdit
                    ? 'การเตือนความจำที่เกิดขึ้นหลังจากนี้จะถูกแก้ไขด้วย'
                    : 'การเตือนความจำที่เกิดขึ้นหลังจากนี้จะถูกลบทั้งหมด'}
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>ยกเลิก</Text>
          </Pressable>
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
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Prompt_600SemiBold',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 12
  },
  modalMessage: {
    fontSize: 15,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  reminderName: {
    fontFamily: 'Prompt_600SemiBold',
    color: '#225877'
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20
  },
  optionButton: {
    borderWidth: 2,
    borderColor: '#5FA7D1',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff'
  },
  optionButtonDanger: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  optionContent: {
    gap: 4
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_600SemiBold',
    color: '#225877'
  },
  optionTitleDanger: {
    color: '#EF4444'
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6B7280',
    lineHeight: 18
  },
  optionDescriptionDanger: {
    color: '#DC2626'
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#374151'
  }
})
