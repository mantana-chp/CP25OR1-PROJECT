import {
  borderRadius,
  colors,
  iconSizes,
  spacing,
  typography
} from '@/constants/design-system'
import { HealthLogType } from '@/src/domain/pet.domain'
import { IHealthLog } from '@/src/utils/api/services/health_log_service'
import {
  Activity,
  Edit2,
  Scale,
  Stethoscope,
  Trash2
} from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface ParsedHealthLog {
  type: HealthLogType
  description: string
}

interface HealthLogEntryCardProps {
  log: IHealthLog
  parsed: ParsedHealthLog
  canEdit?: boolean
  canDelete?: boolean
  onEdit?: (log: IHealthLog) => void
  onDelete?: (log: IHealthLog) => void
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
  parsed,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete
}: HealthLogEntryCardProps) {
  const meta = TYPE_META[parsed.type]
  const TypeIcon = meta.icon
  const showActions = canEdit || canDelete

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.typeChip, { backgroundColor: meta.bg }]}>
          <TypeIcon size={iconSizes.sm} color={meta.color} strokeWidth={1.8} />
          <Text style={[styles.typeText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>

        {showActions && (
          <View style={styles.actionsRow}>
            {canEdit && onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEdit(log)}
                activeOpacity={0.7}
              >
                <Edit2
                  size={iconSizes.sm}
                  color={colors.primary.light}
                  strokeWidth={1.8}
                />
              </TouchableOpacity>
            )}

            {canDelete && onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onDelete(log)}
                activeOpacity={0.7}
              >
                <Trash2
                  size={iconSizes.sm}
                  color={colors.danger.DEFAULT}
                  strokeWidth={1.8}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
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
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[1],
    marginBottom: spacing[1]
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  typeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4
  },
  typeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1]
  },
  actionButton: {
    padding: 4,
    borderRadius: borderRadius.sm
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.primary.DEFAULT,
    fontFamily: typography.fontFamily.medium,
    lineHeight: 18
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  weightText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.light,
    fontFamily: typography.fontFamily.bold
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.regular,
    lineHeight: 17
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2
  },
  metaDot: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    fontFamily: typography.fontFamily.regular
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.regular
  }
})
