import _ from 'lodash'
import React, { useState } from 'react'

import { IReminder } from '@/src/domain/calendar.domain'
import { Plus } from 'lucide-react-native'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import ReminderCard from './reminder_card'

type TabType = 'todo' | 'done'

export default function ReminderList() {
  // ------------------
  // USE STATE
  // ------------------
  const [activeTab, setActiveTab] = useState<TabType>('todo')

  // ------------------
  // MOCK DATA
  // ------------------
  const todoReminders: IReminder[] = [
    {
      id: 1,
      title: 'พาไปว่ายน้ำ',
      pet_name: 'ร็อคเก็ต',
      reminderDate: '2025-11-05T00:00:00.000Z',
      time: '13.30 น.',
      status: 'todo'
    },
    {
      id: 2,
      title: 'อาบน้ำตัดขน',
      pet_name: 'ร็อคเก็ต',
      reminderDate: '2025-12-19T04:00:00.000Z',
      time: '09.30 น.',
      status: 'todo'
    }
  ]

  const doneReminders: IReminder[] = [
    {
      id: 3,
      title: 'ตรวจสุขภาพ',
      pet_name: 'ร็อคเก็ต',
      reminderDate: '10/09/2568',
      time: '15.00 น.',
      status: 'done'
    }
  ]

  const reminders = activeTab === 'todo' ? todoReminders : doneReminders

  // ------------------
  // RENDER
  // ------------------
  return (
    <ScrollView>
      <View style={styles.container}>
        {/* Tab Header */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('todo')}
            style={[styles.tabButton, { alignItems: 'center' }]}
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
            _.map(reminders, (reminder) => (
              <ReminderCard key={reminder?.id} reminder={reminder} />
            ))
          )}
        </ScrollView>

        {/* Floating Add Reminder Button */}
        <TouchableOpacity
          style={styles.addReminderButton}
          onPress={() => console.log('Add new reminder')}
        >
          <Plus size={32} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff9f1',
    borderRadius: 24
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
  addReminderButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#5FA7D1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible'
  }
})
