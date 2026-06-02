import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import {
  Clock3,
  Copy,
  PawPrint,
  QrCode,
  Share2,
  User
} from 'lucide-react-native'
import React, { useState } from 'react'
import {
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Button from '../../components/button'
import QRCode from 'react-native-qrcode-svg'
import { formatExpiresIn } from '../../../utils/pet_sharing_utils'
import { IPendingInvite } from '@/src/domain/pet_sharing.domain'

interface PendingInviteCardProps {
  pendingInvite: IPendingInvite
  claimLink: string
  canceling: boolean
  onOpenQr: () => void
  onShare: () => void
  onCancel: () => void
}

export default function PendingInviteCard({
  pendingInvite,
  claimLink,
  canceling,
  onOpenQr,
  onShare,
  onCancel
}: PendingInviteCardProps) {
  const [isCopied, setIsCopied] = useState(false)
  const petCount = pendingInvite.pets?.length ?? 0

  const handleCopyCode = () => {
    if (!pendingInvite?.inviteId) return

    Clipboard.setString(pendingInvite.inviteId)
    setIsCopied(true)

    setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>คำเชิญที่รอดำเนินการ</Text>

      <View style={styles.pendingCard}>
        <View style={styles.inviteMetaSection}>
          <View>
            <View style={styles.metaLabelRow}>
              <User size={iconSizes.xs} color={colors.gray[500]} />
              <Text style={styles.metaLabel}>ผู้รับเชิญ</Text>
            </View>
            <View style={styles.recipientBadge}>
              <Text style={styles.recipientText} numberOfLines={1}>
                {pendingInvite.alias || '-'}
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.metaLabelRow}>
              <PawPrint size={iconSizes.xs} color={colors.gray[500]} />
              <Text style={styles.metaLabel}>สัตว์เลี้ยงที่แชร์</Text>
              <Text style={styles.petCountText}>ทั้งหมด {petCount} ตัว</Text>
            </View>
            <View style={styles.petListContainer}>
              {petCount ? (
                <>
                  <View style={styles.petChipRow}>
                    {pendingInvite.pets.map((pet) => (
                      <View key={pet.id} style={styles.petChip}>
                        <Text style={styles.petChipText} numberOfLines={1}>
                          {pet.pet_name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.metaSubtleValue}>
                  ไม่พบข้อมูลสัตว์เลี้ยง
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

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

        <View style={styles.codeContainer}>
          <Text style={styles.codeText} numberOfLines={1}>
            {pendingInvite.inviteId}
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
                isCopied && styles.copyButtonTextSuccess
              ]}
            >
              {isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            QR Code นี้สามารถใช้ได้เพียงครั้งเดียวต่อผู้ใช้งาน {'\n'}
            หลังจากใช้แล้วจะไม่สามารถใช้ซ้ำได้
          </Text>
        </View>

        <View style={styles.pendingActionsRow}>
          <Button
            title="แชร์รหัส"
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
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing[2]
  },
  pendingCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg + 2,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[3] + 2,
    gap: spacing[3]
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light
  },
  inviteMetaSection: {
    gap: spacing[3]
  },
  metaLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.medium
  },
  metaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1]
  },
  recipientBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.light + '1A',
    borderWidth: 1,
    borderColor: colors.primary.light + '33'
  },
  recipientText: {
    fontSize: typography.fontSize.base,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold
  },
  metaSubtleValue: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular
  },
  petListContainer: {
    gap: spacing[1]
  },
  petChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: spacing[1]
  },
  petChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.light + '1F'
  },
  petChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.medium
  },
  petCountText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular
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
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.gray[50] || '#F9FAFB',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing[3]
  },
  codeText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    fontFamily: typography.fontFamily.regular || typography.fontFamily.regular
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.light + '15'
  },
  copyButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.medium
  },
  copyButtonTextSuccess: {
    color: colors.success.DEFAULT
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
  },
  infoBox: {
    backgroundColor: colors.info.light || '#E0F2FE',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.info.DEFAULT || '#0EA5E9'
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.info.dark || '#075985',
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed
  }
})
