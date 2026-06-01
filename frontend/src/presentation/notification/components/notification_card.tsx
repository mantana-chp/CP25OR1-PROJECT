import { INotification } from '@/src/domain/notification.domain'
import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import dayjs from 'dayjs'
import 'dayjs/locale/th'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import { AlertCircle, Bell, ChevronRight, Lightbulb } from 'lucide-react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  getDefaultAvatarBackgroundColorBySpecies,
  getPetPlaceholderIcon,
} from '@/src/utils/pet_avatar'

dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.locale('th')

interface NotificationCardProps {
  notification: INotification
  onPress: (notification: INotification) => void
  isRead: boolean
}

export default function NotificationCard({
  notification,
  onPress,
  isRead,
}: NotificationCardProps) {
  const { reminder, petTips, petInfo } = notification

  const getPetImageUri = (notification: INotification) => {
    return (
      notification.petInfo?.profileImageUrl ||
      notification.reminder?.pets?.profileImageUrl ||
      null
    )
  }

  const getPetSpecies = (notification: INotification) => {
    return (
      notification.petInfo?.species ||
      notification.reminder?.pets?.species ||
      null
    )
  }

  const getPetAvatarBackgroundColor = (notification: INotification) => {
    return (
      notification.petInfo?.avatarBackgroundColor ||
      notification.reminder?.pets?.avatarBackgroundColor ||
      getDefaultAvatarBackgroundColorBySpecies(getPetSpecies(notification))
    )
  }

  const petImageUri = getPetImageUri(notification)
  const petSpecies = getPetSpecies(notification)
  const petAvatarBackgroundColor = getPetAvatarBackgroundColor(notification)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return { label: 'เลยกำหนด', color: '#BF1737', bgColor: '#FEE2E2' }
      case 'pending':
        return { label: 'วันนี้', color: '#F59E0B', bgColor: '#FEF3C7' }
      case 'done':
        return { label: 'เสร็จแล้ว', color: '#059669', bgColor: '#D1FAE5' }
      default:
        return null
    }
  }

  const formatRelativeTime = (date: string, time?: string) => {
    const now = dayjs()
    const reminderDate = dayjs(date)
    const diffDays = reminderDate.diff(now, 'day')
    const diffHours = reminderDate.diff(now, 'hour')

    if (diffDays === 0) {
      if (time) {
        return `วันนี้ ${time.substring(0, 5)} น.`
      }
      return 'วันนี้'
    }

    if (diffDays === 1) {
      if (time) {
        return `พรุ่งนี้ ${time.substring(0, 5)} น.`
      }
      return 'พรุ่งนี้'
    }

    if (diffDays > 0 && diffDays < 7) {
      const dayName = reminderDate.locale('th').format('dddd')
      if (time) {
        return `${dayName} ${time.substring(0, 5)} น.`
      }
      return dayName
    }

    if (diffHours < 0 && diffHours > -24) {
      return `${Math.abs(diffHours)} ชั่วโมงที่แล้ว`
    }

    const formatted = reminderDate.locale('th').format('D MMM')
    if (time) {
      return `${formatted} ${time.substring(0, 5)} น.`
    }
    return formatted
  }
  if (petTips && !reminder) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.tipsCard, isRead && styles.readCard]}
        activeOpacity={0.7}
        onPress={() => onPress(notification)}
      >
        <View style={styles.cardContent}>
          <View style={styles.leadingColumn}>
            <View style={styles.iconContainer}>
              <Lightbulb
                size={18}
                color={isRead ? '#9CA3AF' : '#F59E0B'}
                fill={isRead ? '#9CA3AF' : '#F59E0B'}
              />
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentSection}>
            <View style={styles.headerRow}>
              <Text
                style={[styles.tipsTitle, isRead && styles.readText]}
                numberOfLines={1}
              >
                {petTips.title}
              </Text>
              {petInfo && (
                <Text
                  style={[styles.petBadge, isRead && styles.readSecondaryText]}
                >
                  {petInfo.name}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.tipsDescription,
                isRead && styles.readSecondaryText,
              ]}
              numberOfLines={2}
            >
              {petTips.desc}
            </Text>
          </View>

          {/* Chevron */}
          <ChevronRight
            size={18}
            color={isRead ? '#D1D5DB' : '#F59E0B'}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    )
  }

  if (!reminder) {
    return null
  }

  const statusBadge = getStatusBadge(reminder.reminderStatus)
  const timeDisplay = formatRelativeTime(
    reminder.reminderDate,
    reminder.reminderTime,
  )
  const isOverdue = reminder.reminderStatus === 'overdue'

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isOverdue && styles.overdueCard,
        isRead && styles.readCard,
      ]}
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
    >
      <View style={styles.cardContent}>
        <View style={styles.leadingColumn}>
          <View style={styles.petAvatarWrap}>
            {petImageUri ? (
              <Image
                source={{ uri: petImageUri }}
                style={styles.petAvatarImage}
              />
            ) : (
              <View
                style={[
                  styles.image,
                  styles.placeholderImage,
                  { backgroundColor: petAvatarBackgroundColor },
                ]}
              >
                <MaterialCommunityIcons
                  name={getPetPlaceholderIcon(petSpecies)}
                  size={24}
                  color='white'
                />
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.reminderTitle,
                isOverdue && styles.overdueText,
                isRead && styles.readText,
              ]}
              numberOfLines={1}
            >
              {reminder.reminderName}
            </Text>
            {statusBadge && (!isRead || reminder.reminderStatus === 'done') && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBadge.bgColor },
                ]}
              >
                <Text
                  style={[styles.statusBadgeText, { color: statusBadge.color }]}
                >
                  {statusBadge.label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailsRow}>
            <Text style={[styles.petName, isRead && styles.readSecondaryText]}>
              {reminder.pets?.petName || '-'}
            </Text>
            <View style={styles.separator} />
            <Text
              style={[
                styles.timeText,
                isOverdue && styles.overdueText,
                isRead && styles.readSecondaryText,
              ]}
            >
              {timeDisplay}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <ChevronRight
          size={18}
          color={isRead ? '#D1D5DB' : isOverdue ? '#BF1737' : '#2E759E'}
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#2E759E',
  },
  readCard: {
    backgroundColor: '#F9FAFB',
    borderLeftColor: '#D1D5DB',
  },
  tipsCard: {
    borderLeftColor: '#F59E0B',
  },
  overdueCard: {
    borderLeftColor: '#BF1737',
    backgroundColor: '#FFF5F5',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  leadingColumn: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 1,
  },
  petAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  petAvatarImage: {
    width: '100%',
    height: '100%',
  },
  petAvatarFallbackText: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 12,
    color: '#6B7280',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: '#5FA7D1',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  contentSection: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  reminderTitle: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  tipsTitle: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 14,
    color: '#F59E0B',
    flex: 1,
  },
  overdueText: {
    color: '#BF1737',
  },
  readText: {
    color: '#9CA3AF',
  },
  readSecondaryText: {
    color: '#D1D5DB',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontFamily: 'Prompt_500Medium',
    fontSize: 11,
  },
  petBadge: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 12,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petName: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 13,
    color: '#6B7280',
  },
  separator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  timeText: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 13,
    color: '#6B7280',
  },
  tipsDescription: {
    fontFamily: 'Prompt_400Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  chevron: {
    marginTop: 6,
  },
})
