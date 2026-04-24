import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type TabType = 'to_do' | 'today' | 'done'

interface ReminderTabHeaderProps {
  isToday: boolean
  activeTab: TabType
  onChangeTab: (tab: TabType) => void
  toDoCount: number
  doneCount: number
}

export default function ReminderTabHeader({
  isToday,
  activeTab,
  onChangeTab,
  toDoCount,
  doneCount
}: ReminderTabHeaderProps) {
  return (
    <View style={styles.tabContainer}>
      {isToday && (
        <TouchableOpacity
          onPress={() => onChangeTab('today')}
          style={styles.tabButton}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'today' && styles.activeTabText
            ]}
          >
            วันนี้
          </Text>
          {activeTab === 'today' && <View style={styles.activeUnderline} />}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => onChangeTab('to_do')}
        style={[styles.tabButton, { alignItems: 'center' }]}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'to_do' && styles.activeTabText
          ]}
        >
          ทั้งหมด {toDoCount > 0 && `(${toDoCount})`}
        </Text>
        {activeTab === 'to_do' && <View style={styles.activeUnderline} />}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onChangeTab('done')}
        style={styles.tabButton}
      >
        <Text
          style={[styles.tabText, activeTab === 'done' && styles.activeTabText]}
        >
          เสร็จสิ้น {doneCount > 0 && `(${doneCount})`}
        </Text>
        {activeTab === 'done' && <View style={styles.activeUnderline} />}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff9f1'
  },
  tabButton: {
    paddingBottom: 4
  },
  tabText: {
    color: '#C4C4C4',
    fontSize: 17,
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
    height: 2,
    backgroundColor: '#225877'
  }
})
