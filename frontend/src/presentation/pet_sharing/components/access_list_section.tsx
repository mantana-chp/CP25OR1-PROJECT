import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography,
} from '@/constants/design-system'
import { IPendingTransfer } from '@/src/domain/pet_transfer.domain'
import { ICaregiver } from '@/src/domain/pet_sharing.domain'
import { Crown, Users } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import TransferOwnerSection from '../../pet_transfer/components/transfer_owner_section'
import Button from '../../components/button'
import { getInitials } from '../../../utils/pet_sharing_utils'

interface PetSharingAccessListProps {
  caregivers: ICaregiver[]
  revoking: boolean
  onRevoke: (caregiver: ICaregiver) => void
  isOwner?: boolean
  canManageAccess?: boolean
  ownerDisplayName?: string
  selfAccessId?: string
  isDeceasedPet?: boolean
  pendingTransfer?: IPendingTransfer | null
  transferClaimLink?: string
  initiatingTransfer?: boolean
  cancelingTransfer?: boolean
  onInitiateTransfer?: () => void
  onOpenTransferQr?: () => void
  onShareTransfer?: () => void
  onCancelTransfer?: () => void
  onOpenReceiveTransfer?: () => void
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

function AvatarCircle({
  name,
  color = colors.primary.light,
}: {
  name: string
  color?: string
}) {
  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  )
}

export default function AccessListSection({
  caregivers,
  revoking,
  onRevoke,
  isOwner = true,
  canManageAccess,
  ownerDisplayName = 'เจ้าของสัตว์เลี้ยง',
  selfAccessId,
  isDeceasedPet = false,
  pendingTransfer = null,
  transferClaimLink = '',
  initiatingTransfer = false,
  cancelingTransfer = false,
  onInitiateTransfer,
  onOpenTransferQr,
  onShareTransfer,
  onCancelTransfer,
  onOpenReceiveTransfer,
}: PetSharingAccessListProps) {
  const canManage = canManageAccess ?? isOwner

  const currentUserAlias = selfAccessId
    ? caregivers.find((caregiver) => caregiver.accessId === selfAccessId)?.alias
    : null

  const normalizeSelfDisplayName = (name: string) => {
    const trimmedName = name.trim()

    if (isOwner) {
      return 'คุณ'
    }

    if (currentUserAlias && trimmedName === currentUserAlias.trim()) {
      return 'คุณ'
    }

    return trimmedName
  }

  const displayOwnerName = normalizeSelfDisplayName(ownerDisplayName)

  const getDisplayCaregiverName = (caregiver: ICaregiver) => {
    if (!isOwner && selfAccessId && caregiver.accessId === selfAccessId) {
      return 'คุณ'
    }
    return caregiver.alias
  }

  return (
    <View>
      <View style={styles.sectionCard}>
        <SectionTitle>รายชื่อผู้มีสิทธิ์เข้าถึง</SectionTitle>

        <View style={styles.memberRow}>
          <AvatarCircle name={displayOwnerName} color={colors.primary.light} />
          <View style={styles.memberInfoWrapper}>
            {isOwner ? (
              <>
                <Text style={styles.memberName}>คุณ</Text>
                <View style={styles.memberRoleRow}>
                  <Crown size={iconSizes.xs} color={colors.gray[400]} />
                  <Text style={styles.ownerRoleText}>เจ้าของสัตว์เลี้ยง</Text>
                </View>
              </>
            ) : (
              <View style={styles.memberRoleRow}>
                <Crown size={iconSizes.xs} color={colors.gray[400]} />
                <Text style={styles.memberName}>{displayOwnerName}</Text>
              </View>
            )}
          </View>
        </View>

        {caregivers.map((caregiver) => (
          <View key={caregiver.accessId}>
            <View style={styles.memberDivider} />
            <View style={styles.memberRow}>
              <AvatarCircle name={getDisplayCaregiverName(caregiver)} />

              <View style={styles.memberInfoWrapper}>
                <Text style={styles.memberName}>
                  {getDisplayCaregiverName(caregiver)}
                </Text>
                <View style={styles.memberRoleRow}>
                  <Users size={iconSizes.xs} color={colors.gray[400]} />
                  <Text style={styles.caregiverRoleText}>ผู้ดูแลร่วม</Text>
                </View>
              </View>

              {canManage && (
                <Button
                  title='ลบผู้ดูแล'
                  onPress={() => onRevoke(caregiver)}
                  variant='ghost'
                  size='small'
                  loading={revoking}
                  style={styles.revokeButton}
                  textStyle={styles.revokeButtonText}
                />
              )}
            </View>
          </View>
        ))}
      </View>

      <TransferOwnerSection
        isOwner={isOwner}
        isDeceasedPet={isDeceasedPet}
        pendingTransfer={pendingTransfer}
        claimLink={transferClaimLink}
        initiating={initiatingTransfer}
        canceling={cancelingTransfer}
        onInitiateTransfer={onInitiateTransfer ?? (() => {})}
        onOpenQr={onOpenTransferQr ?? (() => {})}
        onShare={onShareTransfer ?? (() => {})}
        onCancel={onCancelTransfer ?? (() => {})}
        onOpenReceiveTransfer={onOpenReceiveTransfer ?? (() => {})}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing[2],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 56,
  },
  memberDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[2],
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    color: colors.background.secondary,
    fontFamily: typography.fontFamily.medium,
  },
  memberInfoWrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 1,
  },
  memberName: {
    fontSize: typography.fontSize.xl,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
  },
  memberRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerRoleText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular,
  },
  caregiverRoleText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular,
  },
  revokeButton: {
    borderWidth: 1,
    borderColor: colors.danger.DEFAULT,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  revokeButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.danger.DEFAULT,
    fontFamily: typography.fontFamily.medium,
  },
})
