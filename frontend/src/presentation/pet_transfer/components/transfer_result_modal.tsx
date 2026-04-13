import {
  borderRadius,
  colors,
  spacing,
  typography,
} from '@/constants/design-system'
import { ITransferPreviewPet } from '@/src/domain/pet_transfer.domain'
import { CheckCircle2, PawPrint } from 'lucide-react-native'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Button from '../../components/button'
import Modal from '../../components/modal'

interface TransferResultModalProps {
  visible: boolean
  title?: string
  transferredPets: ITransferPreviewPet[]
  onClose: () => void
}

export default function TransferResultModal({
  visible,
  title = 'โอนสิทธิ์สำเร็จ',
  transferredPets,
  onClose,
}: TransferResultModalProps) {
  return (
    <Modal visible={visible} onClose={onClose} maxWidth={440}>
      <View style={styles.header}>
        <CheckCircle2 size={46} color={colors.success.DEFAULT} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>
          ระบบได้โอนความเป็นเจ้าของเรียบร้อยแล้ว
        </Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <PawPrint size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.sectionHeaderText}>
          รายการที่โอนแล้ว ({transferredPets.length})
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.listContent}>
          {transferredPets.map((pet) => (
            <View key={pet.id} style={styles.petItem}>
              <Text style={styles.petName}>{pet.petName}</Text>
              <Text style={styles.petMeta}>
                {pet.species ?? '-'} • {pet.breed ?? '-'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Button
        title='ไปหน้าโปรไฟล์สัตว์เลี้ยง'
        onPress={onClose}
        style={styles.closeButton}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  title: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.xl,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    marginTop: spacing[1],
    marginBottom: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  sectionHeaderText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  list: {
    maxHeight: 220,
  },
  listContent: {
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  petItem: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    padding: spacing[2],
  },
  petName: {
    fontSize: typography.fontSize.md,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  petMeta: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
  },
  closeButton: {
    marginTop: spacing[3],
  },
})
