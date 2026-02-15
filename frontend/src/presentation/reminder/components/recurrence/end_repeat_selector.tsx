import { IRecurrenceRule } from '@/src/domain/reminder.domain'
import { Check, ChevronRight } from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import DatePicker from '../../../components/date_picker'
import InputText from '../../../components/text_input'

interface EndRepeatSelectorProps {
  recurrenceRule: IRecurrenceRule
  onChange: (rule: IRecurrenceRule) => void
}

export default function EndRepeatSelector({
  recurrenceRule,
  onChange
}: EndRepeatSelectorProps) {
  const [showEndRepeatOptions, setShowEndRepeatOptions] = useState(false)
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: showEndRepeatOptions ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start()
  }, [showEndRepeatOptions])

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  })

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
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <ChevronRight size={18} color="#8E8E93" />
          </Animated.View>
        </View>
      </Pressable>

      {showEndRepeatOptions && (
        <View style={styles.options}>
          <Pressable
            style={[styles.optionRow, { borderBottomWidth: 1 }]}
            onPress={handleNeverSelect}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionText}>ไม่สิ้นสุด</Text>
              <Text style={styles.optionDescription}>ทำซ้ำต่อไปเรื่อยๆ</Text>
            </View>
            {recurrenceRule.endType === 'never' && (
              <Check size={20} color="#007AFF" strokeWidth={2.5} />
            )}
          </Pressable>

          <View style={[styles.optionRow, { borderBottomWidth: 1 }]}>
            <View style={styles.optionContent}>
              <Text style={styles.optionText}>สิ้นสุดในวันที่</Text>
              <Text style={styles.optionDescription}>
                หยุดทำซ้ำเมื่อถึงวันที่กำหนด
              </Text>
            </View>
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

          <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
            <View style={styles.optionContent}>
              <Text style={styles.optionText}>สิ้นสุดหลังจาก</Text>
              <Text style={styles.optionDescription}>
                หยุดทำซ้ำเมื่อครบจำนวนครั้ง
              </Text>
            </View>
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  label: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  value: {
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#8E8E93'
  },
  options: {
    backgroundColor: '#fff',
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  optionContent: {
    flexShrink: 0
  },
  optionText: {
    fontSize: 13,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  optionDescription: {
    fontSize: 11,
    fontFamily: 'Prompt_400Regular',
    color: '#9ca3af',
    marginTop: 2
  },
  afterLabel: {
    fontSize: 13,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  }
})
