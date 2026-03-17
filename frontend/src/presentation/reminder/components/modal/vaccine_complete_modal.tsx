import React from 'react'
import { Text } from 'react-native'
import Modal from '../../../components/modal'

interface VaccineCompleteModalProps {
  visible: boolean
  doseNumber: number
  totalCount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function VaccineCompleteModal({
  visible,
  doseNumber,
  totalCount,
  onConfirm,
  onCancel
}: VaccineCompleteModalProps) {
  return (
    <Modal
      variant="confirmation"
      visible={visible}
      onClose={onCancel}
      icon="success"
      title="ยืนยันการทำเครื่องหมาย"
      message={
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Prompt_400Regular',
            color: '#6b7280',
            textAlign: 'center',
            lineHeight: 22
          }}
        >
          ต้องการทำเครื่องหมาย{' '}
          <Text style={{ fontFamily: 'Prompt_700Bold', color: '#225877' }}>
            วัคซีนเข็มที่ {doseNumber}/{totalCount}
          </Text>{' '}
          ว่าเสร็จสิ้นแล้วใช่หรือไม่?
        </Text>
      }
      confirmText="ยืนยัน"
      cancelText="ยกเลิก"
      onConfirm={onConfirm}
      confirmVariant="success"
    />
  )
}
