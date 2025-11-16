import { INotification } from '@/src/domain/notification.domain'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import dayjs from 'dayjs'
import 'dayjs/locale/th'
import { CalendarDays, PawPrint } from 'lucide-react-native'

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
  const { reminder } = notification

  if (!reminder) {
    return null
  }

  const date = dayjs(reminder.reminderDate).locale('th')
  const buddhistYear = date.year() + 543
  const formattedDate = date.format(`DD/MM/${buddhistYear}`)
  const formattedTime = reminder?.reminderTime
    ? reminder.reminderTime.substring(0, 5) + ' น.'
    : ''

  const cardStyle = [styles.card, isRead && styles.readCard]
  const titleStyle = [styles.title, isRead && styles.readText]
  const infoStyle = [styles.infoText, isRead && styles.readText]
  const iconColor = isRead ? '#A6A6A6' : '#2E759E'

  return (
    <TouchableOpacity
      //   style={styles.card}
      style={cardStyle}
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
    >
      <Text style={titleStyle}>{reminder.reminderName}</Text>
      {/* <Text
        style={[
          //   styles.reminderTitle,
          styles.titleStyle,
          reminder?.reminderStatus === 'overdue' && styles.overdueTitleText,
        ]}
      >
        {reminder?.reminderName}
      </Text> */}

      <View style={styles.infoRow}>
        <PawPrint size={18} color={iconColor} fill={iconColor} />
        <Text style={infoStyle}>{reminder.pet_name || '-'}</Text>
      </View>

      <View style={styles.infoRow}>
        <CalendarDays size={18} color={iconColor} />
        <Text style={infoStyle}>
          {formattedDate}
          {formattedTime ? `, ${formattedTime}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Prompt_700Bold',
    color: '#225877',
    marginBottom: 4,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_700Bold',
  },
  overdueTitleText: {
    color: '#BF1737',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
  },
  readCard: {
    backgroundColor: '#D9D9D9',
  },
  readText: {
    color: '#A6A6A6',
  },
})
