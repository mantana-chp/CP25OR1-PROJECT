import { IReminder } from '@/src/domain/calendar.domain'
import React from 'react'

import dayjs from 'dayjs'
import 'dayjs/locale/th'

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Circle, Clock, Info } from 'lucide-react-native'
export default function ReminderCard(props: { reminder: IReminder }) {
  // ------------------
  // CONST
  // ------------------
  const { reminder } = props
  const date = dayjs(reminder.reminderDate).locale('th')
  const buddhistYear = date.year() + 543
  const formattedDate = date.format(`DD/MM/${buddhistYear}, HH:mm น.`)

  // ------------------
  // RENDER
  // ------------------
  return (
    <View key={reminder.id} style={styles.reminderCard}>
      {/* Left side - Checkbox circle */}
      <View style={styles.leftSection}>
        <View
          style={[
            styles.checkbox,
            reminder?.status === 'done' && styles.checkboxCompleted
          ]}
        >
          {reminder?.status === 'done' && <View style={styles.checkboxInner} />}
        </View>
      </View>

      {/* Middle section - Content */}
      <View style={styles.middleSection}>
        <Text style={styles.reminderTitle}>{reminder?.title}</Text>

        <View style={styles.infoRow}>
          <Circle size={16} color="#2E759E" fill="#2E759E" />
          <Text style={styles.locationText}>{reminder?.pet_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Clock size={16} color="#2E759E" />
          <Text style={styles.dateTimeText}>{formattedDate}</Text>
        </View>
      </View>

      {/* Right side - Info button */}
      <TouchableOpacity style={styles.infoButton}>
        <Info size={24} color="#88BEDD" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 6,
    borderLeftColor: '#88BEDD'
  },
  leftSection: {
    marginRight: 12
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#C4C4C4',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxCompleted: {
    borderColor: '#5FA7D1',
    backgroundColor: '#5FA7D1'
  },
  checkboxInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  middleSection: {
    flex: 1,
    gap: 6
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#225877',
    fontFamily: 'Prompt_700Bold',
    marginBottom: 4
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Prompt_400Regular'
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Prompt_400Regular'
  },
  infoButton: {
    padding: 4
  }
})
