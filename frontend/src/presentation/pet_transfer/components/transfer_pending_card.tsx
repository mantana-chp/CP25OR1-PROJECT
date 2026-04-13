import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import { IPendingTransfer } from '@/src/domain/pet_transfer.domain'
import { Clipboard } from 'react-native'
import { Clock3, Copy, PawPrint, QrCode, Share2 } from 'lucide-react-native'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Button from '../../components/button'
import { formatTransferExpiresIn } from '@/src/utils/pet_transfer_utils'

interface TransferPendingCardProps {
  pendingTransfer: IPendingTransfer
  claimLink: string
  canceling: boolean
  onOpenQr: () => void
  onShare: () => void
  onCancel: () => void
}

export default function TransferPendingCard({
  pendingTransfer,
  claimLink,
  canceling,
  onOpenQr,
  onShare,
  onCancel,
}: TransferPendingCardProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyCode = async () => {
    if (!pendingTransfer.transferId) return

    Clipboard.setString(pendingTransfer.transferId)
    setIsCopied(true)

    setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>คำขอโอนสิทธิ์ที่รอดำเนินการ</Text>
          <View style={styles.timeRow}>
            <Clock3 size={iconSizes.xs} color={colors.gray[500]} />
            <Text style={styles.timeText}>
              {formatTransferExpiresIn(pendingTransfer.expiresAt)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.petsSection}>
        <View style={styles.petsHeaderRow}>
          <PawPrint size={iconSizes.xs} color={colors.gray[500]} />
          <Text style={styles.petsLabel}>สัตว์เลี้ยงที่โอน</Text>
          <Text style={styles.petsCount}>
            ทั้งหมด {pendingTransfer.pets.length} ตัว
          </Text>
        </View>
        <View style={styles.petChipsRow}>
          {pendingTransfer.pets.map((pet) => (
            <View key={pet.id} style={styles.petChip}>
              <Text style={styles.petChipText}>{pet.petName}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.qrContainer}
        onPress={onOpenQr}
        activeOpacity={0.85}
      >
        <View style={styles.qrHintRow}>
          <QrCode size={iconSizes.xs} color={colors.gray[400]} />
          <Text style={styles.qrHintText}>แตะเพื่อดู QR แบบเต็ม</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.codeContainer}>
        <Text style={styles.codeText} numberOfLines={1}>
          {pendingTransfer.transferId}
        </Text>
        <TouchableOpacity
          onPress={handleCopyCode}
          style={styles.copyButton}
          activeOpacity={0.7}
        >
          <Copy
            size={iconSizes.md}
            color={isCopied ? colors.success.DEFAULT : colors.primary.light}
          />
          <Text
            style={[
              styles.copyButtonText,
              isCopied && styles.copyButtonTextSuccess,
            ]}
          >
            {isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.linkRow}>
        <Text numberOfLines={1} style={styles.linkText}>
          {claimLink}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Button
          title='แชร์โค้ด'
          onPress={onShare}
          variant='ghost'
          size='small'
          icon={<Share2 size={iconSizes.sm} color={colors.info.dark} />}
          style={styles.shareButton}
          textStyle={styles.shareButtonText}
        />
        <Button
          title='ยกเลิก'
          onPress={onCancel}
          variant='ghost'
          size='small'
          loading={canceling}
          style={styles.cancelButton}
          textStyle={styles.cancelButtonText}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[3],
    gap: spacing[2],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
  },
  timeRow: {
    marginTop: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  timeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500],
  },
  petsSection: {
    gap: spacing[1],
  },
  petsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  petsLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.medium,
  },
  petsCount: {
    marginLeft: 'auto',
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
  },
  petChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  petChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.light + '1A',
  },
  petChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.medium,
  },
  qrContainer: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  qrHintText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.gray[50] || '#F9FAFB',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing[2],
  },
  codeText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[800],
    fontFamily: typography.fontFamily.regular,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.light + '15',
  },
  copyButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.medium,
  },
  copyButtonTextSuccess: {
    color: colors.success.DEFAULT,
  },
  linkRow: {
    paddingHorizontal: spacing[1],
  },
  linkText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  shareButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    borderColor: colors.info.DEFAULT,
    borderWidth: 1.5,
    backgroundColor: colors.background.secondary,
  },
  shareButtonText: {
    color: colors.info.dark,
    fontFamily: typography.fontFamily.medium,
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    borderColor: colors.danger.DEFAULT,
    borderWidth: 1.5,
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    color: colors.danger.DEFAULT,
    fontFamily: typography.fontFamily.medium,
  },
})
