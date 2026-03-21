import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { IHealthLog } from '@/src/utils/api/services/health_log_service'
import { Activity, Scale, Stethoscope } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export type HealthLogType = 'WEIGHT' | 'SYMPTOMS' | 'BEHAVIOR'

interface ParsedHealthLog {
  type: HealthLogType
  description: string
}

interface HealthLogEntryCardProps {
  log: IHealthLog
  parsed: ParsedHealthLog
}

const TYPE_META: Record<
  HealthLogType,
  { label: string; icon: React.ComponentType<any>; color: string; bg: string }
> = {
  WEIGHT: {
    label: 'น้ำหนัก',
    icon: Scale,
    color: colors.info.dark,
    bg: colors.info.light
  },
  SYMPTOMS: {
    label: 'อาการป่วย',
    icon: Stethoscope,
    color: colors.warning.dark,
    bg: colors.warning.light
  },
  BEHAVIOR: {
    label: 'พฤติกรรม',
    icon: Activity,
    color: colors.success.dark,
    bg: colors.success.light
  }
}

const formatLoggedAt = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const datePart = date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  const timePart = date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${datePart} ${timePart} น.`
}

export default function HealthLogEntryCard({
  log,
  parsed
}: HealthLogEntryCardProps) {
  const meta = TYPE_META[parsed.type]
  const TypeIcon = meta.icon

  return (
    <View style={styles.card}>
      <View style={[styles.typeChip, { backgroundColor: meta.bg }]}>
        <TypeIcon size={iconSizes.sm} color={meta.color} strokeWidth={1.8} />
        <Text style={[styles.typeText, { color: meta.color }]}>
          {meta.label}
        </Text>
      </View>

      <Text style={styles.description}>{parsed.description}</Text>

      {typeof log.weight === 'number' && (
        <View style={styles.weightRow}>
          <Scale
            size={iconSizes.xs}
            color={colors.primary.light}
            strokeWidth={1.8}
          />
          <Text style={styles.weightText}>{log.weight.toFixed(2)} กก.</Text>
        </View>
      )}

      {log.note ? (
        <Text style={styles.noteText}>หมายเหตุ: {log.note}</Text>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>บันทึกโดย: {log.createdBy || '-'}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaText}>{formatLoggedAt(log.loggedAt)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
    marginBottom: spacing[2]
  },
  typeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 6
  },
  typeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.medium,
    lineHeight: typography.lineHeight.normal
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1]
  },
  weightText: {
    fontSize: typography.fontSize.base,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.bold
  },
  noteText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[1]
  },
  metaDot: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular
  }
})
