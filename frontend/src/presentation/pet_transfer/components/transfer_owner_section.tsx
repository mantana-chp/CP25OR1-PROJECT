import {
  borderRadius,
  colors,
  spacing,
  typography,
} from '@/constants/design-system'
import { IPendingTransfer } from '@/src/domain/pet_transfer.domain'
import { ArrowRightLeft, ShieldAlert } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../../components/button'
import TransferPendingCard from './transfer_pending_card'

interface TransferOwnerSectionProps {
  isOwner: boolean
  isDeceasedPet: boolean
  pendingTransfer: IPendingTransfer | null
  claimLink: string
  initiating: boolean
  canceling: boolean
  onInitiateTransfer: () => void
  onOpenQr: () => void
  onShare: () => void
  onCancel: () => void
  onOpenReceiveTransfer: () => void
}

export default function TransferOwnerSection({
  isOwner,
  isDeceasedPet,
  pendingTransfer,
  claimLink,
  initiating,
  canceling,
  onInitiateTransfer,
  onOpenQr,
  onShare,
  onCancel,
  onOpenReceiveTransfer,
}: TransferOwnerSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>โอนสิทธิ์เจ้าของ</Text>
      <Text style={styles.sectionSubtitle}>
        โอนความเป็นเจ้าของให้บัญชีอื่นผ่าน QR Code หรือรหัสโอนสิทธิ์
      </Text>

      {isOwner ? (
        isDeceasedPet ? (
          <View style={styles.warningBox}>
            <ShieldAlert size={16} color={colors.warning.dark} />
            <Text style={styles.warningText}>
              ไม่สามารถโอนสิทธิ์สัตว์เลี้ยงที่ถูกทำเครื่องหมายว่าเสียชีวิตแล้ว
            </Text>
          </View>
        ) : pendingTransfer ? (
          <TransferPendingCard
            pendingTransfer={pendingTransfer}
            claimLink={claimLink}
            canceling={canceling}
            onOpenQr={onOpenQr}
            onShare={onShare}
            onCancel={onCancel}
          />
        ) : (
          <Button
            title='เลือกสัตว์เลี้ยงเพื่อโอนสิทธิ์'
            onPress={onInitiateTransfer}
            loading={initiating}
            disabled={initiating}
            icon={
              <ArrowRightLeft size={16} color={colors.background.secondary} />
            }
            style={styles.primaryActionButton}
          />
        )
      ) : (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            เฉพาะเจ้าของสัตว์เลี้ยงเท่านั้นที่เริ่มคำขอโอนสิทธิ์ได้
          </Text>
        </View>
      )}

      <Button
        title='รับโอนสิทธิ์ด้วย QR/Code'
        onPress={onOpenReceiveTransfer}
        variant='ghost'
        style={styles.receiveButton}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  sectionCard: {
    marginTop: spacing[4],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    lineHeight: typography.lineHeight.relaxed,
    fontFamily: typography.fontFamily.regular,
  },
  primaryActionButton: {
    backgroundColor: colors.info.DEFAULT,
  },
  receiveButton: {
    borderRadius: borderRadius.full,
  },
  infoBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.gray[50],
    padding: spacing[2],
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    lineHeight: typography.lineHeight.relaxed,
  },
  warningBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
    backgroundColor: colors.warning.light,
    padding: spacing[2],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warning.dark,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.lineHeight.relaxed,
  },
})
