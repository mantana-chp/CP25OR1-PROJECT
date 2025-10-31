import React from 'react'

import { IReminder } from '@/src/domain/calendar.domain'
import { Circle, Clock, Info } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function ReminderCard(props: { reminder: IReminder }) {
  const { reminder } = props

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
        <Text style={styles.reminderTitle}>{reminder.title}</Text>

        <View style={styles.infoRow}>
          <Circle size={16} color="#6B9AC4" fill="#6B9AC4" />
          <Text style={styles.locationText}>{reminder.location}</Text>
        </View>

        <View style={styles.infoRow}>
          <Clock size={16} color="#6B9AC4" />
          <Text style={styles.dateTimeText}>
            {reminder?.reminderDate}, {reminder.time}
          </Text>
        </View>
      </View>

      {/* Right side - Info button */}
      <TouchableOpacity style={styles.infoButton}>
        <Info size={24} color="#6B9AC4" />
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
    borderLeftColor: '#6B9AC4'
  },
  leftSection: {
    marginRight: 12
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#C4C4C4',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxCompleted: {
    borderColor: '#6B9AC4',
    backgroundColor: '#6B9AC4'
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
