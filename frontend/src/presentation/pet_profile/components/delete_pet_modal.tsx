import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Modal from '../../components/modal'
import Button from '../../components/button'
import { History } from 'lucide-react-native'

interface DeletePetModalProps {
  visible: boolean
  petName: string
  onClose: () => void
  onDelete: () => void
  isLoading?: boolean
}

export default function DeletePetModal({
  visible,
  petName,
  onClose,
  onDelete,
  isLoading = false
}: DeletePetModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      variant="default"
      title="ยืนยันการลบสัตว์เลี้ยง"
      maxWidth={360}
      icon="trash"
    >
      <View style={styles.content}>
        <Text style={styles.petNameLabel}>"{petName}"</Text>
        <Text style={styles.description}>
          จะถูกลบออกจากรายการสัตว์เลี้ยงของคุณ
        </Text>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillText}>
            <History size={12} color={'#92400e'} /> ยังสามารถกู้คืนได้ภายใน 30
            วัน
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button
            title="ยกเลิก"
            onPress={onClose}
            variant="ghost"
            disabled={isLoading}
            style={styles.buttonHalf}
          />
          <Button
            title={isLoading ? 'กำลังลบ...' : 'ลบออก'}
            onPress={onDelete}
            variant="error"
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
    width: '100%',
    alignItems: 'center'
  },
  petNameLabel: {
    fontSize: 18,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    textAlign: 'center',
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8
  },
  infoPill: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 24
  },
  infoPillText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#92400e',
    textAlign: 'center'
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  buttonHalf: {
    flex: 1
  }
})
