import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Modal from '../../components/modal'
import Button from '../../components/button'

type DeleteReason = 'delete' | 'deceased' | null

interface DeletePetModalProps {
  visible: boolean
  petName: string
  onClose: () => void
  onDelete: () => void
  onDeceased: () => void
  isLoading?: boolean
}

export default function DeletePetModal({
  visible,
  petName,
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
      onClose={handleClose}
      variant="default"
      title="เหตุผลที่ต้องการลบ"
      maxWidth={360}
    >
      <View style={styles.content}>
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
              ย้ายไปยัง "เพิ่งลบล่าสุด" สามารถกู้คืนได้ภายใน 30 วัน
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
          <Button
            title="ยกเลิก"
            onPress={handleClose}
            variant="ghost"
            disabled={isLoading}
            style={styles.buttonHalf}
          />
          <Button
            title={isLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
            onPress={handleConfirm}
            variant={reason === 'deceased' ? 'base' : 'error'}
            disabled={!reason}
            loading={isLoading}
            style={styles.buttonHalf}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  content: {
    width: '100%'
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
  buttonHalf: {
    flex: 1
  }
})
