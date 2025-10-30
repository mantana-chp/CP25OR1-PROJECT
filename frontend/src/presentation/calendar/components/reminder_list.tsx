import { IReminder } from '@/src/domain/calendar.domain'
import { Circle, Clock, Info, Plus } from 'lucide-react-native'
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
  const todoReminders: IReminder[] = [
    {
      id: 1,
      title: 'พาไปว่ายน้ำ',
      location: 'ร้อคเก็ต',
      reminderDate: '17/09/2568',
      time: '13.30 น.',
      status: 'todo'
    },
    {
      id: 2,
      title: 'อาบน้ำตัดขน',
      location: 'ร้อคเก็ต',
      reminderDate: '24/09/2568',
      time: '09.30 น.',
      status: 'todo'
    }
  ]

  const doneReminders: IReminder[] = [
    {
      id: 3,
      title: 'ตรวจสุขภาพ',
      location: 'คลินิกสัตว์เลี้ยง',
      reminderDate: '10/09/2568',
      time: '15.00 น.',
      status: 'done'
    }
  ]

  const reminders = activeTab === 'todo' ? todoReminders : doneReminders

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('todo')}
          style={styles.tabButton}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'todo' && styles.activeTabText
            ]}
          >
            นัดหมาย
          </Text>
          {activeTab === 'todo' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('done')}
          style={styles.tabButton}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'done' && styles.activeTabText
            ]}
          >
            เสร็จสิ้น
          </Text>
          {activeTab === 'done' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>
      </View>

      {/* IReminder Content */}
      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
              {/* Left side - Checkbox circle */}
              <View style={styles.leftSection}>
                <View
                  style={[
                    styles.checkbox,
                    reminder?.status === 'done' && styles.checkboxCompleted
                  ]}
                >
                  {reminder?.status === 'done' && (
                    <View style={styles.checkboxInner} />
                  )}
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
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => console.log('Add new reminder')}
      >
        <Plus size={32} color="#fff" strokeWidth={3} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff9f1',
    borderRadius: 16
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff9f1'
  },
  tabButton: {
    paddingBottom: 8
  },
  tabText: {
    color: '#C4C4C4',
    fontSize: 20,
    fontFamily: 'Prompt_400Regular'
  },
  activeTabText: {
    color: '#225877',
    fontFamily: 'Prompt_700Bold'
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#225877'
  },
  contentContainer: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: '#C4C4C4',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular'
  },
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
  },
  fabButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6B9AC4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }
})
