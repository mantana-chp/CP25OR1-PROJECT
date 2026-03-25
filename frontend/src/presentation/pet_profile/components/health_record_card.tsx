import { getCategoryInfo, IReminder } from '@/src/domain/reminder.domain'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import {
  Bug,
  CalendarDays,
  Clock,
  FileText,
  Hospital,
  PawPrint,
  Pill,
  Syringe
} from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface HealthRecordCardProps {
  reminder: IReminder
  onPress?: () => void
}

const CATEGORY_ICON: Record<string, any> = {
  Checkup: Hospital,
  Vaccination: Syringe,
  Medication: Pill,
  Deworming: Bug
}

// Pastel background for category badge
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function HealthRecordCard({
  reminder,
  onPress
}: HealthRecordCardProps) {
  const categoryInfo = getCategoryInfo(reminder.categoryName)
  const CategoryIcon = CATEGORY_ICON[reminder.categoryName] || FileText

  const formatDate = (dateString: string) => {
    return (
      dayjs(dateString).locale('th').format('D MMM') +
      ` ${dayjs(dateString).year() + 543}`
    )
  }

  const formatTime = (timeString: string) => timeString.substring(0, 5) + ' น.'

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Left color accent bar */}
      <View
        style={[styles.accentBar, { backgroundColor: categoryInfo.color }]}
      />

      {/* Icon */}
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: hexToRgba(categoryInfo.color, 0.12) }
        ]}
      >
        <CategoryIcon size={20} color={categoryInfo.color} strokeWidth={2} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Category badge */}
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: hexToRgba(categoryInfo.color, 0.1) }
          ]}
        >
          <View
            style={[
              styles.categoryDot,
              { backgroundColor: categoryInfo.color }
            ]}
          />
          <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
            {categoryInfo.label}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {reminder.reminderName}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <CalendarDays size={13} color="#9ca3af" strokeWidth={2} />
            <Text style={styles.metaText}>
              {formatDate(reminder.reminderDate)}
              {reminder.reminderTime
                ? `, ${formatTime(reminder.reminderTime)}`
                : ''}
            </Text>
          </View>
          {reminder.pet_name && (
            <View style={styles.metaItem}>
              <Ionicons name={'paw-outline'} size={13} color={'#9ca3af'} />
              <Text style={styles.metaText}>{reminder.pet_name}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    marginRight: 10,
    marginLeft: 0
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  content: {
    flex: 1,
    gap: 2
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 20,
    gap: 3
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 3
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Prompt_500Medium'
  },
  title: {
    fontSize: 14,
    fontFamily: 'Prompt_700Bold',
    color: '#225877'
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 1
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af'
  }
})
