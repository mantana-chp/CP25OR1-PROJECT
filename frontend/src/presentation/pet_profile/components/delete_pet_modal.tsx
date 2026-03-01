import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

type DeleteReason = 'delete' | 'deceased' | null

interface DeletePetModalProps {
  visible: boolean
  petName: string
  hasRelations: boolean
  onClose: () => void
  onDelete: () => void
  onDeceased: () => void
  isLoading?: boolean
}

export default function DeletePetModal({
  visible,
  petName,
  hasRelations,
  onClose,
  onDelete,
  onDeceased,
  isLoading = false
}: DeletePetModalProps) {
  const [reason, setReason] = useState<DeleteReason>(null)

  const handleClose = () => {
    setReason(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!reason) return
    if (reason === 'deceased') {
      setReason(null)
      onDeceased()
    } else {
      setReason(null)
      onDelete()
    }
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>เหตุผลที่ต้องการลบ</Text>
          <Text style={styles.subtitle}>
            คุณต้องการลบ <Text style={styles.petName}>"{petName}"</Text>{' '}
            เพราะอะไร?
          </Text>

          {/* Option: Just delete */}
          <Pressable
            style={[
              styles.optionCard,
              reason === 'delete' && styles.optionCardSelected
            ]}
            onPress={() => setReason('delete')}
          >
            <View style={styles.optionRadio}>
              {reason === 'delete' && <View style={styles.optionRadioInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionTitle,
                  reason === 'delete' && styles.optionTitleSelected
                ]}
              >
                ต้องการลบออก
              </Text>
              <Text style={styles.optionDesc}>
                {hasRelations
                  ? 'ย้ายไปยัง "เพิ่งลบล่าสุด" สามารถกู้คืนได้'
                  : 'ลบข้อมูลออกจากระบบถาวร'}
              </Text>
            </View>
          </Pressable>

          {/* Option: Pet passed away */}
          <Pressable
            style={[
              styles.optionCard,
              reason === 'deceased' && styles.optionCardDeceasedSelected
            ]}
            onPress={() => setReason('deceased')}
          >
            <View
              style={[
                styles.optionRadio,
                reason === 'deceased' && styles.optionRadioDeceased
              ]}
            >
              {reason === 'deceased' && (
                <View style={styles.optionRadioInnerDeceased} />
              )}
            </View>
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionTitle,
                  reason === 'deceased' && styles.optionTitleDeceased
                ]}
              >
                🕊️ น้องเสียชีวิตแล้ว
              </Text>
              <Text style={styles.optionDesc}>
                บันทึกเป็น "สัตว์เลี้ยงในความทรงจำ" ยังดูประวัติได้
              </Text>
            </View>
          </Pressable>

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                reason === 'deceased'
                  ? styles.confirmDeceasedButton
                  : styles.confirmDeleteButton,
                (!reason || isLoading) && styles.disabledButton
              ]}
              onPress={handleConfirm}
              disabled={!reason || isLoading}
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
    marginHorizontal: 24,
    width: '90%',
    maxWidth: 360
  },
  title: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 6
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20
  },
  petName: {
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    backgroundColor: '#fafafa'
  },
  optionCardSelected: {
    borderColor: '#5FA7D1',
    backgroundColor: '#EBF5FB'
  },
  optionCardDeceasedSelected: {
    borderColor: '#9ca3af',
    backgroundColor: '#f3f4f6'
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center'
  },
  optionRadioDeceased: {
    borderColor: '#6b7280'
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5FA7D1'
  },
  optionRadioInnerDeceased: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6b7280'
  },
  optionContent: {
    flex: 1
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#374151',
    marginBottom: 2
  },
  optionTitleSelected: {
    color: '#225877'
  },
  optionTitleDeceased: {
    color: '#4b5563'
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af'
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
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
  confirmDeleteButton: {
    backgroundColor: '#BF1737'
  },
  confirmDeceasedButton: {
    backgroundColor: '#6b7280'
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  },
  disabledButton: {
    opacity: 0.4
  }
})
