import {
  borderRadius,
  colors,
  spacing,
  typography,
} from '@/constants/design-system'
import { IPendingTransfer } from '@/src/domain/pet_transfer.domain'
import { CheckCircle2, PawPrint } from 'lucide-react-native'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Button from '../../components/button'
import Modal from '../../components/modal'

interface OwnerTransferCompletedModalProps {
  visible: boolean
  completedTransfer: IPendingTransfer | null
  onClose: () => void
}

export default function OwnerTransferCompletedModal({
  visible,
  completedTransfer,
  onClose,
}: OwnerTransferCompletedModalProps) {
  return (
    <Modal visible={visible} onClose={onClose} maxWidth={440}>
      <View style={styles.header}>
        <CheckCircle2 size={46} color={colors.success.DEFAULT} />
        <Text style={styles.title}>โอนสิทธิ์สำเร็จแล้ว</Text>
        <Text style={styles.subtitle}>
          ผู้รับโอนได้ยืนยันรับสิทธิ์เรียบร้อยแล้ว
          คุณจะไม่สามารถเข้าถึงข้อมูลสัตว์เลี้ยงในรายการนี้ได้อีก
        </Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <PawPrint size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.sectionHeaderText}>
          รายการที่โอนสำเร็จ ({completedTransfer?.pets.length ?? 0})
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.listContent}>
          {(completedTransfer?.pets ?? []).map((pet) => (
            <View key={pet.id} style={styles.petItem}>
              <Text style={styles.petName}>{pet.petName}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Button
        title='กลับหน้าโปรไฟล์สัตว์เลี้ยง'
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
  subtitle: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
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
  closeButton: {
    marginTop: spacing[3],
  },
})
