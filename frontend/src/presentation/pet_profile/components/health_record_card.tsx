import { IReminder } from '@/src/domain/reminder.domain'
import dayjs from 'dayjs'
import {
  Bug,
  Clock,
  FileText,
  Hospital,
  PawPrint,
  Pill,
  Syringe
} from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface HealthRecordCardProps {
  reminder: IReminder
}

export default function HealthRecordCard(props: HealthRecordCardProps) {
  const { reminder } = props

  const getHealthRecordIcon = (category: string) => {
    switch (category) {
      case 'Checkup':
      case 'ตรวจสุขภาพ':
        return Hospital

      case 'Vaccination':
      case 'วัคซีน':
        return Syringe

      case 'Medication':
      case 'ยา/อาหารเสริม':
        return Pill

      case 'Deworming':
      case 'พยาธิ/เห็บหมัด':
        return Bug

      default:
        return FileText
    }
  }

  const HealthRecordIcon = getHealthRecordIcon(reminder.categoryName)

  const formatDate = (dateString: string) => {
    const date = dayjs(dateString).locale('th')
    const formattedDate = `${date.format('วันdddd DD MMM')} ${
      date.year() + 543
    }`
    return formattedDate
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) + ' น.'
  }
  return (
    <View style={styles.card}>
      {/* Left Side: Hero Icon Circle */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <HealthRecordIcon size={32} color="#FFFFFF" strokeWidth={2} />
        </View>
      </View>

      {/* Right Side: Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.titleText} numberOfLines={1}>
          {reminder.reminderName}
        </Text>

        <View style={styles.infoRow}>
          <PawPrint size={16} color="#2E759E" />
          <Text style={styles.infoText}>{reminder.pet_name || '-'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Clock size={16} color="#2E759E" />
          <Text style={[styles.infoText]}>
            {reminder.reminderTime
              ? `${formatDate(reminder.reminderDate)}, ${formatTime(
                  reminder.reminderTime
                )}`
              : formatDate(reminder.reminderDate)}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3
  },
  iconContainer: {
    marginRight: 16
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5FA7D1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  smallIcon: {
    marginRight: 6
  },
  infoText: {
    fontSize: 14,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  }
})
