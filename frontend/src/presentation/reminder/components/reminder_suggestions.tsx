import { IReminder } from '@/src/domain/reminder.domain'
import { Clock, RefreshCw } from 'lucide-react-native'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

interface ReminderSuggestionsProps {
  suggestions: IReminder[]
  onSelect: (reminder: IReminder) => void
  visible: boolean
}

export default function ReminderSuggestions({
  suggestions,
  onSelect,
  visible
}: ReminderSuggestionsProps) {
  if (!visible || suggestions.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock size={14} color="#6b7280" />
        <Text style={styles.headerText}>คำแนะนำจากประวัติ</Text>
      </View>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled={true}
      >
        {suggestions.map((item) => (
          <Pressable
            key={item.id}
            style={styles.suggestionItem}
            onPress={() => onSelect(item)}
            android_ripple={{ color: '#e5e7eb' }}
          >
            <View style={styles.suggestionContent}>
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionTitle}>{item.reminderName}</Text>
                {item.recurrence && (
                  <View style={styles.recurringBadge}>
                    <RefreshCw size={10} color="#5FA7D1" />
                  </View>
                )}
              </View>
              <View style={styles.suggestionMeta}>
                <Text style={styles.suggestionCategory}>
                  {item.categoryName || 'ทั่วไป'}
                </Text>
                <Text style={styles.suggestionDot}>•</Text>
                <Text style={styles.suggestionPet}>{item.pet_name}</Text>
                <Text style={styles.suggestionDot}>•</Text>
                <Text style={styles.suggestionDate}>
                  {formatDate(item.reminderDate)}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    maxHeight: 250,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerText: {
    fontSize: 12,
    fontFamily: 'Prompt_500Medium',
    color: '#6b7280'
  },
  list: {
    maxHeight: 200
  },
  listContent: {
    paddingVertical: 4
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  suggestionContent: {
    gap: 4
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  suggestionTitle: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    flex: 1
  },
  recurringBadge: {
    backgroundColor: '#E8F4F8',
    borderRadius: 10,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  suggestionCategory: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  suggestionDot: {
    fontSize: 12,
    color: '#d1d5db'
  },
  suggestionPet: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  },
  suggestionDate: {
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    color: '#6b7280'
  }
})
