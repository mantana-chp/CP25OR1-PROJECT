import { IRecurrenceRule } from '@/src/domain/reminder.domain'
import { Check, ChevronRight } from 'lucide-react-native'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import DatePicker from '../../components/date_picker'
import InputText from '../../components/text_input'

interface EndRepeatSelectorProps {
  recurrenceRule: IRecurrenceRule
  onChange: (rule: IRecurrenceRule) => void
}

export default function EndRepeatSelector({
  recurrenceRule,
  onChange
}: EndRepeatSelectorProps) {
  const [showEndRepeatOptions, setShowEndRepeatOptions] = useState(false)

  const getDisplayValue = () => {
    if (recurrenceRule.endType === 'never') {
      return 'ไม่สิ้นสุด'
    }
    if (recurrenceRule.endType === 'on_date' && recurrenceRule.endDate) {
      return new Date(recurrenceRule.endDate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    if (
      recurrenceRule.endType === 'after' &&
      recurrenceRule.endAfterOccurrences
    ) {
      return `หลังจาก ${recurrenceRule.endAfterOccurrences} ครั้ง`
    }
    return 'ในวันที่'
  }

  const handleNeverSelect = () => {
    onChange({
      ...recurrenceRule,
      endType: 'never',
      endDate: undefined,
      endAfterOccurrences: undefined
    })
    setShowEndRepeatOptions(false)
  }

  const handleDateChange = (date: Date) => {
    if (date) {
      onChange({
        ...recurrenceRule,
        endType: 'on_date',
        endDate: date.toISOString(),
        endAfterOccurrences: undefined
      })
    }
  }

  const handleAfterChange = (text: string) => {
    const num = parseInt(text)
    if (!isNaN(num) && num > 0) {
      onChange({
        ...recurrenceRule,
        endType: 'after',
        endAfterOccurrences: num,
        endDate: undefined
      })
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={() => setShowEndRepeatOptions(!showEndRepeatOptions)}
      >
        <Text style={styles.label}>สิ้นสุดการทำซ้ำ</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{getDisplayValue()}</Text>
          <ChevronRight size={18} color="#C7C7CC" />
        </View>
      </Pressable>

      {showEndRepeatOptions && (
        <View style={styles.options}>
          <Pressable style={styles.optionRow} onPress={handleNeverSelect}>
            <Text style={styles.optionText}>ไม่สิ้นสุด</Text>
            {recurrenceRule.endType === 'never' && (
              <Check size={20} color="#007AFF" strokeWidth={2.5} />
            )}
          </Pressable>

          <View style={styles.optionRow}>
            <Text style={styles.optionText}>ในวันที่</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <DatePicker
                title=""
                placeholder="เลือกวันที่"
                value={
                  recurrenceRule.endDate
                    ? new Date(recurrenceRule.endDate)
                    : undefined
                }
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>

          <View style={styles.optionRow}>
            <Text style={styles.optionText}>หลังจาก</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                flex: 1,
                marginLeft: 12
              }}
            >
              <View style={{ flex: 1 }}>
                <InputText
                  value={recurrenceRule.endAfterOccurrences?.toString() || ''}
                  onChangeText={handleAfterChange}
                  keyboardType="numeric"
                  placeholder="จำนวน"
                  title=""
                />
              </View>
              <Text style={styles.afterLabel}>ครั้ง</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  label: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  value: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#8E8E93'
  },
  options: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 8
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 1
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  afterLabel: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  }
})
