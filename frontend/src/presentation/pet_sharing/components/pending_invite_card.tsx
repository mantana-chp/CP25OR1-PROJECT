import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { IPendingInvite } from '@/src/utils/api/services/pet_sharing_service'
import { Clock3, QrCode, Share2 } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Button from '../../components/button'
import QRCode from 'react-native-qrcode-svg'
import { formatExpiresIn } from '../../../utils/pet_sharing_utils'

interface PendingInviteCardProps {
  pendingInvite: IPendingInvite
  claimLink: string
  canceling: boolean
  onOpenQr: () => void
  onShare: () => void
  onCancel: () => void
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

export default function PendingInviteCard({
  pendingInvite,
  claimLink,
  canceling,
  onOpenQr,
  onShare,
  onCancel
}: PendingInviteCardProps) {
  return (
    <View style={styles.wrapper}>
      <SectionTitle>คำเชิญที่รอดำเนินการ</SectionTitle>

      <View style={styles.pendingCard}>
        <View style={styles.pendingCardHeader}>
          <View>
            <Text style={styles.pendingCodeText}>รหัสคำเชิญ</Text>
            <View style={styles.pendingTimeRow}>
              <Clock3 size={iconSizes.xs} color={colors.gray[400]} />
              <Text style={styles.pendingTimeText}>
                {formatExpiresIn(pendingInvite.expiresAt)}
              </Text>
            </View>
          </View>

          <View style={styles.pendingBadge}>
            <View style={styles.pendingBadgeDot} />
            <Text style={styles.pendingBadgeText}>รอดำเนินการ</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.qrContainer}
          onPress={onOpenQr}
          activeOpacity={0.85}
        >
          <QRCode value={claimLink} size={150} />
          <View style={styles.qrHintRow}>
            <QrCode size={iconSizes.xs} color={colors.gray[400]} />
            <Text style={styles.qrHintText}>แตะเพื่อขยาย QR</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.pendingActionsRow}>
          <Button
            title="แบ่งปันรหัสอีกครั้ง"
            onPress={onShare}
            variant="ghost"
            size="small"
            icon={<Share2 size={iconSizes.sm} color={colors.info.dark} />}
            style={styles.shareAgainButton}
            textStyle={styles.shareAgainButtonText}
          />

          <Button
            title="ยกเลิก"
            onPress={onCancel}
            variant="ghost"
            size="small"
            loading={canceling}
            style={styles.cancelInviteButton}
            textStyle={styles.cancelInviteButtonText}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing[3] + 2
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing[2]
  },
  pendingCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg + 2,
    borderTopWidth: 4,
    borderColor: colors.primary.light,
    padding: spacing[3] + 2,
    gap: spacing[3]
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  pendingCodeText: {
    fontSize: typography.fontSize.base + 2,
    color: colors.info.dark,
    fontFamily: typography.fontFamily.medium
  },
  pendingTimeRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1]
  },
  pendingTimeText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1] + 2,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: spacing[1],
    backgroundColor: colors.warning.light
  },
  pendingBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning.DEFAULT
  },
  pendingBadgeText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning.dark,
    fontFamily: typography.fontFamily.medium
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingTop: spacing[1] + 2
  },
  qrHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1]
  },
  qrHintText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: 4
  },
  shareAgainButton: {
    flex: 1,
    minHeight: spacing[10],
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.info.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[1] + 2,
    backgroundColor: colors.background.secondary
  },
  shareAgainButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.info.dark,
    fontFamily: typography.fontFamily.medium
  },
  cancelInviteButton: {
    flex: 1,
    minHeight: spacing[10],
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.danger.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary
  },
  cancelInviteButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.danger.DEFAULT,
    fontFamily: typography.fontFamily.medium
  }
})
