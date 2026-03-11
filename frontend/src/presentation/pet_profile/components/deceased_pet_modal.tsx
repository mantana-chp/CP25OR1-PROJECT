import React from 'react'
import Modal from '../../components/modal'
import { Ribbon } from 'lucide-react-native'

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
      onClose={onClose}
      variant="confirmation"
      icon={<Ribbon size={24} color="#6b7280" />}
      title="ทำเครื่องหมายว่าเสียชีวิต"
      message={`คุณแน่ใจหรือไม่ว่า "${petName}" เสียชีวิตแล้ว?\n\nการนัดหมายที่เกี่ยวข้องจะถูกปิด และโปรไฟล์จะถูกย้ายไปยัง "สัตว์เลี้ยงในความทรงจำ"`}
      onConfirm={onConfirm}
      confirmVariant="base"
      isLoading={isLoading}
      maxWidth={340}
    />
  )
}
