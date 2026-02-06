import { ChevronRight, Repeat } from 'lucide-react-native'
import React, { useState } from 'react'

import {
  IRecurrenceRule,
  RecurrenceType,
  Weekday
} from '@/src/domain/reminder.domain'
import { formatRecurrenceText } from '@/src/utils/recurrence.utils'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import InputText from '../../components/text_input'
import EndConditionSelector from './end_condition_selector'
import MonthlyOptions from './monthly_options'
import WeekdaySelector from './weekday_selector'

interface RecurrencePickerProps {
  value: IRecurrenceRule
  onChange: (rule: IRecurrenceRule) => void
  reminderDate?: Date
}

export default function RecurrencePicker({
  value,
  onChange,
  reminderDate
}: RecurrencePickerProps) {
  const [showModal, setShowModal] = useState(false)
  const [tempRule, setTempRule] = useState<IRecurrenceRule>(value)

  const recurrenceTypes: {
    value: RecurrenceType
    label: string
  }[] = [
    { value: 'none', label: 'ไม่ทำซ้ำ' },
    { value: 'daily', label: 'ทุกวัน' },
    { value: 'weekly', label: 'ทุกสัปดาห์' },
    { value: 'monthly', label: 'ทุกเดือน' },
    { value: 'yearly', label: 'ทุกปี' },
    { value: 'custom', label: 'กำหนดเอง' }
  ]

  const handleOpen = () => {
    setTempRule(value)
    setShowModal(true)
  }

  const handleTypeChange = (type: RecurrenceType) => {
    const newRule: IRecurrenceRule = {
      ...tempRule,
      type,
      interval: type === 'none' ? 1 : tempRule.interval
    }

    // Set default values based on type
    if (type === 'weekly' && !newRule.weekdays) {
      const dayOfWeek = reminderDate?.getDay() || new Date().getDay()
      const weekdayMap: Weekday[] = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
      ]
      newRule.weekdays = [weekdayMap[dayOfWeek]]
    }

    if (type === 'monthly' && !newRule.monthlyType) {
      const dayOfMonth = reminderDate?.getDate() || new Date().getDate()
      newRule.monthlyType = 'day_of_month'
      newRule.dayOfMonth = dayOfMonth
    }

    setTempRule(newRule)
  }

  const handleWeekdaysChange = (weekdays: Weekday[]) => {
    setTempRule({ ...tempRule, weekdays })
  }

  const handleMonthlyTypeChange = (
    monthlyType: 'day_of_month' | 'last_day',
    dayOfMonth?: number
  ) => {
    setTempRule({
      ...tempRule,
      monthlyType,
      dayOfMonth: monthlyType === 'day_of_month' ? dayOfMonth : undefined
    })
  }

  const handleIntervalChange = (interval: string) => {
    const numInterval = parseInt(interval) || 1
    setTempRule({
      ...tempRule,
      interval: Math.max(1, Math.min(999, numInterval))
    })
  }

  const handleEndConditionChange = (
    endType: 'never' | 'after' | 'on_date',
    endAfterOccurrences?: number,
    endDate?: string
  ) => {
    setTempRule({
      ...tempRule,
      endType,
      endAfterOccurrences,
      endDate
    })
  }

  const handleConfirm = () => {
    onChange(tempRule)
    setShowModal(false)
  }

  const handleCancel = () => {
    setTempRule(value)
    setShowModal(false)
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.label}>
          <Text style={styles.labelText}>การทำซ้ำ</Text>
          <Repeat size={14} color="#225877" />
        </View>
        <Pressable style={styles.button} onPress={handleOpen}>
          <Text style={styles.buttonText}>
            {formatRecurrenceText(value, 'th')}
          </Text>
          <ChevronRight size={20} color="#A6A6A6" />
        </Pressable>
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>การทำซ้ำ</Text>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Recurrence Type Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ประเภทการทำซ้ำ</Text>
                {recurrenceTypes.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.option,
                      tempRule.type === type.value && styles.optionSelected
                    ]}
                    onPress={() => handleTypeChange(type.value)}
                  >
                    <View
                      style={[
                        styles.radio,
                        tempRule.type === type.value && styles.radioSelected
                      ]}
                    >
                      {tempRule.type === type.value && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.optionText}>{type.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Interval for custom and selected types */}
              {tempRule.type !== 'none' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>ทุก</Text>
                  <View style={styles.intervalRow}>
                    <View style={{ flex: 1 }}>
                      <InputText
                        value={tempRule.interval.toString()}
                        onChangeText={handleIntervalChange}
                        keyboardType="numeric"
                        placeholder="1"
                        title=""
                      />
                    </View>
                    <Text style={styles.intervalLabel}>
                      {tempRule.type === 'daily' && 'วัน'}
                      {tempRule.type === 'weekly' && 'สัปดาห์'}
                      {tempRule.type === 'monthly' && 'เดือน'}
                      {tempRule.type === 'yearly' && 'ปี'}
                      {tempRule.type === 'custom' && 'วัน'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Weekday Selection for Weekly */}
              {tempRule.type === 'weekly' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>วันในสัปดาห์</Text>
                  <WeekdaySelector
                    selectedDays={tempRule.weekdays || []}
                    onChange={handleWeekdaysChange}
                  />
                </View>
              )}

              {/* Monthly Options */}
              {tempRule.type === 'monthly' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>ทำซ้ำในวันที่</Text>
                  <MonthlyOptions
                    monthlyType={tempRule.monthlyType || 'day_of_month'}
                    dayOfMonth={
                      tempRule.dayOfMonth ||
                      reminderDate?.getDate() ||
                      new Date().getDate()
                    }
                    onChange={handleMonthlyTypeChange}
                  />
                </View>
              )}

              {/* End Condition */}
              {tempRule.type !== 'none' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>สิ้นสุด</Text>
                  <EndConditionSelector
                    endType={tempRule.endType}
                    endAfterOccurrences={tempRule.endAfterOccurrences}
                    endDate={tempRule.endDate}
                    onChange={handleEndConditionChange}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>ตกลง</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  label: {
    marginBottom: 4,
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  labelText: {
    color: '#225877',
    fontSize: 14,
    fontFamily: 'Prompt_400Regular'
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
  buttonText: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    flex: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    textAlign: 'center'
  },
  modalBody: {
    padding: 20
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 12
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB'
  },
  optionSelected: {
    backgroundColor: '#E8F4F8'
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioSelected: {
    borderColor: '#5FA7D1'
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5FA7D1'
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Prompt_400Regular',
    color: '#225877'
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  intervalLabel: {
    fontSize: 16,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    paddingTop: 8
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#374151'
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5FA7D1',
    alignItems: 'center'
  },
  confirmButtonText: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  }
})
