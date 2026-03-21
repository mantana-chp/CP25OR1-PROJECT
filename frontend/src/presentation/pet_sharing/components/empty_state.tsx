import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { UserPlus } from 'lucide-react-native'
import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import Button from '../../components/button'

interface EmptyStateProps {
  onCreateInvite: () => void
  isDeceasedPet?: boolean
}

export default function EmptyState({
  onCreateInvite,
  isDeceasedPet
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.imageCircle}>
        <Image
          source={require('@/assets/images/empty-pet-sharing.jpg')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>ไม่มีรายชื่อผู้ดูแลร่วมกัน</Text>
      <Text style={styles.subtitle}>
        {!isDeceasedPet
          ? 'คุณยังไม่มีผู้ดูแลร่วมสำหรับสัตว์เลี้ยงของคุณในขณะนี้\nเชิญเพื่อนหรือครอบครัวมาช่วยดูแลกันเถอะ'
          : 'ไม่มีผู้ดูแลร่วมสำหรับสัตว์เลี้ยงของคุณ'}
      </Text>

      {!isDeceasedPet && (
        <Button
          title="เชิญ"
          onPress={onCreateInvite}
          icon={
            <UserPlus size={iconSizes.lg} color={colors.background.secondary} />
          }
          style={styles.createInviteButton}
          textStyle={styles.createInviteButtonText}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10]
  },
  imageCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 14,
    borderColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    marginBottom: spacing[4]
  },
  image: {
    width: 190,
    height: 190,
    borderRadius: 88
  },
  title: {
    fontSize: typography.fontSize['4xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.primary.DEFAULT,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[400],
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    marginTop: 2,
    marginBottom: spacing[5]
  },
  createInviteButton: {
    width: '100%',
    minHeight: spacing[12],
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: colors.primary.light
  },
  createInviteButtonText: {
    fontSize: typography.fontSize.lg,
    color: colors.background.secondary,
    fontFamily: typography.fontFamily.bold
  }
})
