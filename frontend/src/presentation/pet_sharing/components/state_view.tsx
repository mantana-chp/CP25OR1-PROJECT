import {
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { AlertCircle } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface PetSharingStateViewProps {
  title: string
  subtitle: string
}

export default function PetSharingStateView({
  title,
  subtitle
}: PetSharingStateViewProps) {
  return (
    <View style={styles.container}>
      <AlertCircle size={iconSizes['4xl']} color={colors.gray[400]} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[2]
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed
  }
})
