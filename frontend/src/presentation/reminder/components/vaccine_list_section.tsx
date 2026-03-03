import { IReminder } from '@/src/domain/reminder.domain'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  XCircle
} from 'lucide-react-native'
import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

interface VaccineListSectionProps {
  children: IReminder[]
}

const formatTime = (time: Date) => {
  return time.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const parseApiTime = (timeString: string): Date => {
  if (!timeString) return new Date()

  const [hours, minutes, seconds] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, seconds || 0)
  return date
}

export default function VaccineListSection({
  children
}: VaccineListSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>วัคซีนทั้งหมด ({children.length} เข็ม)</Text>
        {isExpanded ? (
          <ChevronUp size={16} color="#225877" />
        ) : (
          <ChevronDown size={16} color="#225877" />
        )}
      </Pressable>

      {isExpanded && (
        <ScrollView style={styles.scrollView} nestedScrollEnabled={true}>
          <View style={styles.list}>
            {[...children]
              .sort(
                (a, b) =>
                  new Date(a.reminderDate).getTime() -
                  new Date(b.reminderDate).getTime()
              )
              .map((child) => {
                const isCompleted = child.reminderStatus === 'done'
                const isOverdueChild = child.reminderStatus === 'overdue'
                const statusColor = isCompleted
                  ? '#15AD90'
                  : isOverdueChild
                    ? '#DC2626'
                    : '#FF9531'

                return (
                  <View
                    key={child.id}
                    style={[styles.item, { borderLeftColor: statusColor }]}
                  >
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>
                          {child.reminderName}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isCompleted
                                ? '#E6FFFA'
                                : isOverdueChild
                                  ? '#FEE2E2'
                                  : '#FFF4E6'
                            }
                          ]}
                        >
                          {isCompleted ? (
                            <Check size={14} color="#15AD90" />
                          ) : isOverdueChild ? (
                            <XCircle size={14} color="#DC2626" />
                          ) : (
                            <Hourglass size={14} color="#FF9531" />
                          )}
                        </View>
                      </View>
                      <View style={styles.itemInfo}>
                        <CalendarDays
                          size={12}
                          color={isOverdueChild ? '#DC2626' : '#6b7280'}
                        />
                        <Text
                          style={[
                            styles.infoText,
                            isOverdueChild && styles.overdueText
                          ]}
                        >
                          {child.reminderDate
                            ? new Date(child.reminderDate).toLocaleDateString(
                                'th-TH',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: '2-digit'
                                }
                              )
                            : '-'}
                        </Text>
                        <View style={styles.dot} />
                        <Clock
                          size={12}
                          color={isOverdueChild ? '#DC2626' : '#6b7280'}
                        />
                        <Text
                          style={[
                            styles.infoText,
                            isOverdueChild && styles.overdueText
                          ]}
                        >
                          {child.reminderTime
                            ? `${formatTime(
                                parseApiTime(child.reminderTime)
                              )} น.`
                            : '-'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    gap: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  title: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  scrollView: {
    maxHeight: 180
  },
  list: {
    gap: 8
  },
  item: {
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 3
  },
  itemContent: {
    gap: 6
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemName: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap'
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  overdueText: {
    color: '#DC2626',
    fontFamily: 'Prompt_600SemiBold'
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d1d5db'
  }
})
