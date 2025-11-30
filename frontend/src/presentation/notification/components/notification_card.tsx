import { INotification } from '@/src/domain/notification.domain'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import dayjs from 'dayjs'
import 'dayjs/locale/th'
import utc from 'dayjs/plugin/utc'
import { Clock, PawPrint } from 'lucide-react-native'

dayjs.extend(utc)

interface NotificationCardProps {
  notification: INotification
  onPress: (notification: INotification) => void
  isRead: boolean
}

export default function NotificationCard({
  notification,
  onPress,
  isRead
}: NotificationCardProps) {
  const { reminder } = notification

  if (!reminder) {
    return null
  }
  
  const date = dayjs(reminder.reminderDate).locale('th')
  const buddhistYear = date.year() + 543
  const formattedDate = date.format(`DD/MM/${buddhistYear}`)
  const formattedTime = reminder?.reminderTime
    ? dayjs(reminder.reminderTime).utc().format('HH:mm น.')
    : ''

  const cardStyle = [styles.card, isRead && styles.readCard]
  const titleStyle = [
    styles.title,
    reminder?.reminderStatus === 'overdue' && styles.overdueTitleText,
    isRead && styles.readText
  ]
  const infoStyle = [
    styles.infoText,
    reminder?.reminderStatus === 'overdue' && styles.overdueDateTimeText,
    isRead && styles.readText
  ]
  const iconColor = isRead
    ? '#A6A6A6'
    : reminder?.reminderStatus === 'overdue'
    ? '#BF1737'
    : '#2E759E'

  return (
    <TouchableOpacity
      style={cardStyle}
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
    >
      {/* Middle section - Content */}
      <View style={styles.middleSection}>
        <Text style={titleStyle}>{reminder?.reminderName}</Text>

        <View style={styles.infoRow}>
          <PawPrint size={18} color={iconColor} fill={iconColor} />
          <Text style={infoStyle}>{reminder?.pets?.petName || '-'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Clock size={18} color={iconColor} />
          <Text style={infoStyle}>
            {formattedTime
              ? `${formattedDate}, ${formattedTime}`
              : formattedDate}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  title: {
    fontSize: 18,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    marginBottom: 4
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  overdueTitleText: {
    color: '#BF1737'
  },
  overdueDateTimeText: {
    color: '#BF1737'
  },
  middleSection: {
    flex: 1,
    gap: 2
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  readCard: {
    backgroundColor: '#ffffff'
  },
  readText: {
    color: '#6b7280'
  }
})
