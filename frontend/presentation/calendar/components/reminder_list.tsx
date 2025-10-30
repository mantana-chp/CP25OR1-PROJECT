import React, { useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

type TabType = 'todo' | 'done'

export default function ReminderList() {
  const [activeTab, setActiveTab] = useState<TabType>('todo')

  // Mock data - replace with your actual data
  const todoReminders = [
    { id: 1, title: 'ตรวจสุขภาพประจำปี', date: '15 พ.ย. 2568', time: '14:00' },
    { id: 2, title: 'ฉีดวัคซีน', date: '20 พ.ย. 2568', time: '10:30' },
    { id: 3, title: 'ตัดเล็บ', date: '25 พ.ย. 2568', time: '16:00' }
  ]

  const doneReminders = [
    {
      id: 4,
      title: 'อาบน้ำ',
      date: '10 พ.ย. 2568',
      time: '15:00',
      completed: true
    },
    {
      id: 5,
      title: 'ให้ยาถ่ายพยาธิ',
      date: '5 พ.ย. 2568',
      time: '09:00',
      completed: true
    }
  ]

    const reminders = activeTab === 'todo' ? todoReminders : doneReminders

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setActiveTab('todo')}
        style={styles.tabButton}
      >
        <Text
          style={[
            styles.inactiveText,
            activeTab === 'todo' && styles.activeText
          ]}
        >
          นัดหมาย
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActiveTab('done')}
        style={styles.tabButton}
      >
        <Text
          style={[
            styles.inactiveText,
            activeTab === 'done' && styles.activeText
          ]}
        >
          เสร็จสิ้น
        </Text>
      </TouchableOpacity>

      {/* Reminder Content */}
      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'todo'
                ? 'ไม่มีนัดหมาย'
                : 'ไม่มีรายการที่เสร็จสิ้น'}
            </Text>
          </View>
        ) : (
          reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <Text style={styles.reminderTitle}>{reminder.title}</Text>
                {activeTab === 'done' && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.reminderDate}>
                {reminder.date} • {reminder.time}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    alignItems: 'flex-start',
    backgroundColor: '#fff9f1',
    marginTop: 24,
    flexDirection: 'row',
    gap: 24,
    paddingLeft: 16,
    width: '100%',
    height: '100%'
  },
  inactiveText: {
    color: '#A6A6A6',
    fontSize: 17,
    fontFamily: 'Prompt_400Regular',
    paddingTop: 12
  },
  activeText: {
    color: '#225877',
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  tabButton: {
    paddingVertical: 12
  },
  contentContainer: {
    flex: 1,
    paddingTop: 16
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: '#A6A6A6',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular'
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Prompt_400Regular',
    flex: 1
  },
  reminderDate: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Prompt_400Regular'
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center'
  },
  completedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  }
})
