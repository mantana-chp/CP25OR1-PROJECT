import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { ICaregiver } from '@/src/utils/api/services/pet_sharing_service'
import { Crown, Users } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Button from '../../components/button'
import { getInitials } from '../../../utils/pet_sharing_utils'

interface PetSharingAccessListProps {
  caregivers: ICaregiver[]
  revoking: boolean
  onRevoke: (caregiver: ICaregiver) => void
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

function AvatarCircle({
  name,
  color = colors.primary.light
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
  onRevoke
}: PetSharingAccessListProps) {
  return (
    <View style={styles.sectionCard}>
      <SectionTitle>รายชื่อผู้มีสิทธิ์เข้าถึง</SectionTitle>

      <View style={styles.memberRow}>
        <AvatarCircle name="คุณ" color={colors.primary.light} />
        <View style={styles.memberInfoWrapper}>
          <Text style={styles.memberName}>คุณ</Text>
          <View style={styles.memberRoleRow}>
            <Crown size={iconSizes.xs} color={colors.gray[400]} />
            <Text style={styles.ownerRoleText}>เจ้าของสัตว์เลี้ยง</Text>
          </View>
        </View>
      </View>

      {caregivers.map((caregiver) => (
        <View key={caregiver.accessId}>
          <View style={styles.memberDivider} />
          <View style={styles.memberRow}>
            <AvatarCircle name={caregiver.alias} />

            <View style={styles.memberInfoWrapper}>
              <Text style={styles.memberName}>{caregiver.alias}</Text>
              <View style={styles.memberRoleRow}>
                <Users size={iconSizes.xs} color={colors.gray[400]} />
                <Text style={styles.caregiverRoleText}>ผู้ดูแลร่วม</Text>
              </View>
            </View>

            <Button
              title="ลบผู้ดูแล"
              onPress={() => onRevoke(caregiver)}
              variant="ghost"
              size="small"
              loading={revoking}
              style={styles.revokeButton}
              textStyle={styles.revokeButtonText}
            />
          </View>
        </View>
      ))}
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
    paddingVertical: spacing[3]
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing[2]
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 56
  },
  memberDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[2]
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    color: colors.background.secondary,
    fontFamily: typography.fontFamily.medium
  },
  memberInfoWrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 1
  },
  memberName: {
    fontSize: typography.fontSize.xl,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold
  },
  memberRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ownerRoleText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular
  },
  caregiverRoleText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular
  },
  revokeButton: {
    borderWidth: 1,
    borderColor: colors.danger.DEFAULT,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary
  },
  revokeButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.danger.DEFAULT,
    fontFamily: typography.fontFamily.medium
  }
})
