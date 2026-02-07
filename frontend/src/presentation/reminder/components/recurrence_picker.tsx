import { Check, ChevronRight, Repeat } from 'lucide-react-native'
import React, { useState } from 'react'

import {
  IRecurrenceRule,
  RecurrenceType,
  Weekday
} from '@/src/domain/reminder.domain'
import { formatRecurrenceText } from '@/src/utils/recurrence.utils'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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

type PresetType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'every3months'
  | 'every6months'
  | 'yearly'
  | 'custom'

interface PresetOption {
  type: PresetType
  label: string
  rule: IRecurrenceRule
}

export default function RecurrencePicker({
  value,
  onChange,
  reminderDate
}: RecurrencePickerProps) {
  const [showMainModal, setShowMainModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [tempRule, setTempRule] = useState<IRecurrenceRule>(value)

  // Get default weekday from reminder date
  const getDefaultWeekday = (): Weekday => {
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
    return weekdayMap[dayOfWeek]
  }

  // Get default day of month
  const getDefaultDayOfMonth = (): number => {
    return reminderDate?.getDate() || new Date().getDate()
  }

  // Preset options like iPhone
  const presetOptions: PresetOption[] = [
    {
      type: 'none',
      label: 'ไม่ทำซ้ำ',
      rule: { type: 'none', interval: 1, endType: 'never' }
    },
    {
      type: 'daily',
      label: 'ทุกวัน',
      rule: { type: 'daily', interval: 1, endType: 'never' }
    },
    {
      type: 'weekly',
      label: 'ทุกสัปดาห์',
      rule: {
        type: 'weekly',
        interval: 1,
        weekdays: [getDefaultWeekday()],
        endType: 'never'
      }
    },
    {
      type: 'biweekly',
      label: 'ทุก 2 สัปดาห์',
      rule: {
        type: 'weekly',
        interval: 2,
        weekdays: [getDefaultWeekday()],
        endType: 'never'
      }
    },
    {
      type: 'monthly',
      label: 'ทุกเดือน',
      rule: {
        type: 'monthly',
        interval: 1,
        monthlyType: 'day_of_month',
        dayOfMonth: getDefaultDayOfMonth(),
        endType: 'never'
      }
    },
    {
      type: 'every3months',
      label: 'ทุก 3 เดือน',
      rule: {
        type: 'monthly',
        interval: 3,
        monthlyType: 'day_of_month',
        dayOfMonth: getDefaultDayOfMonth(),
        endType: 'never'
      }
    },
    {
      type: 'every6months',
      label: 'ทุก 6 เดือน',
      rule: {
        type: 'monthly',
        interval: 6,
        monthlyType: 'day_of_month',
        dayOfMonth: getDefaultDayOfMonth(),
        endType: 'never'
      }
    },
    {
      type: 'yearly',
      label: 'ทุกปี',
      rule: { type: 'yearly', interval: 1, endType: 'never' }
    }
  ]

  // Check if current value matches a preset
  const getCurrentPreset = (): PresetType => {
    for (const preset of presetOptions) {
      const { rule } = preset
      if (
        value.type === rule.type &&
        value.interval === rule.interval &&
        value.endType === rule.endType &&
        (!rule.weekdays ||
          JSON.stringify(value.weekdays) === JSON.stringify(rule.weekdays)) &&
        (!rule.monthlyType || value.monthlyType === rule.monthlyType)
      ) {
        return preset.type
      }
    }
    return 'custom'
  }

  const handleOpenMainModal = () => {
    setShowMainModal(true)
  }

  const handleSelectPreset = (preset: PresetOption) => {
    if (preset.type === 'custom') {
      setTempRule(value)
      setShowMainModal(false)
      setShowCustomModal(true)
    } else {
      onChange(preset.rule)
      setShowMainModal(false)
    }
  }

  const handleOpenCustomFromMain = () => {
    setTempRule(value)
    setShowMainModal(false)
    setShowCustomModal(true)
  }

  const handleTypeChange = (type: RecurrenceType) => {
    const newRule: IRecurrenceRule = {
      ...tempRule,
      type,
      interval: tempRule.interval || 1
    }

    // Set default values based on type
    if (type === 'weekly' && !newRule.weekdays) {
      newRule.weekdays = [getDefaultWeekday()]
    }

    if (type === 'monthly' && !newRule.monthlyType) {
      newRule.monthlyType = 'day_of_month'
      newRule.dayOfMonth = getDefaultDayOfMonth()
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

  const handleCustomConfirm = () => {
    onChange(tempRule)
    setShowCustomModal(false)
  }

  const handleCustomCancel = () => {
    setTempRule(value)
    setShowCustomModal(false)
  }

  const currentPreset = getCurrentPreset()
  const displayText = formatRecurrenceText(value, 'th')

  return (
    <>
      <View style={styles.container}>
        <View style={styles.label}>
          <Text style={styles.labelText}>การทำซ้ำ</Text>
          <Repeat size={14} color="#225877" />
        </View>
        <Pressable style={styles.button} onPress={handleOpenMainModal}>
          <Text style={styles.buttonText}>{displayText}</Text>
          <ChevronRight size={20} color="#A6A6A6" />
        </Pressable>
      </View>

      {/* Main Selection Modal - iPhone style */}
      <Modal
        visible={showMainModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMainModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMainModal(false)}
        >
          <Pressable
            style={styles.mainModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.mainModalHeader}>
              <Text style={styles.mainModalTitle}>การทำซ้ำ</Text>
            </View>

            <ScrollView style={styles.mainModalBody}>
              {presetOptions.map((preset) => (
                <Pressable
                  key={preset.type}
                  style={styles.presetOption}
                  onPress={() => handleSelectPreset(preset)}
                >
                  <Text style={styles.presetOptionText}>{preset.label}</Text>
                  {currentPreset === preset.type && (
                    <Check size={20} color="#5FA7D1" strokeWidth={3} />
                  )}
                </Pressable>
              ))}

              {/* Custom Option */}
              <Pressable
                style={styles.presetOption}
                onPress={handleOpenCustomFromMain}
              >
                <Text style={styles.presetOptionText}>กำหนดเอง</Text>
                <View style={styles.customOptionRow}>
                  {currentPreset === 'custom' && (
                    <Check
                      size={20}
                      color="#5FA7D1"
                      strokeWidth={3}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <ChevronRight size={20} color="#A6A6A6" />
                </View>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Configuration Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
        onRequestClose={handleCustomCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>กำหนดเองการทำซ้ำ</Text>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                {/* Frequency Type */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>ความถี่</Text>
                  <View style={styles.frequencyRow}>
                    {(
                      [
                        'daily',
                        'weekly',
                        'monthly',
                        'yearly'
                      ] as RecurrenceType[]
                    ).map((type) => (
                      <Pressable
                        key={type}
                        style={[
                          styles.frequencyChip,
                          tempRule.type === type && styles.frequencyChipSelected
                        ]}
                        onPress={() => handleTypeChange(type)}
                      >
                        <Text
                          style={[
                            styles.frequencyChipText,
                            tempRule.type === type &&
                              styles.frequencyChipTextSelected
                          ]}
                        >
                          {type === 'daily' && 'วัน'}
                          {type === 'weekly' && 'สัปดาห์'}
                          {type === 'monthly' && 'เดือน'}
                          {type === 'yearly' && 'ปี'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Interval */}
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
                    </Text>
                  </View>
                </View>

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
                      dayOfMonth={tempRule.dayOfMonth || getDefaultDayOfMonth()}
                      onChange={handleMonthlyTypeChange}
                    />
                  </View>
                )}

                {/* End Condition */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>สิ้นสุด</Text>
                  <EndConditionSelector
                    endType={tempRule.endType}
                    endAfterOccurrences={tempRule.endAfterOccurrences}
                    endDate={tempRule.endDate}
                    onChange={handleEndConditionChange}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={handleCustomCancel}
                >
                  <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmButton}
                  onPress={handleCustomConfirm}
                >
                  <Text style={styles.confirmButtonText}>ตกลง</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end'
  },

  // Main Modal (Preset Selection) - iPhone style
  mainModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%'
  },
  mainModalHeader: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center'
  },
  mainModalTitle: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  mainModalBody: {
    paddingVertical: 8
  },
  presetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB'
  },
  presetOptionText: {
    fontSize: 17,
    fontFamily: 'Prompt_400Regular',
    color: '#225877',
    flex: 1
  },
  customOptionRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  // Custom Modal
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Prompt_500Medium',
    color: '#225877'
  },
  modalBody: {
    padding: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Prompt_500Medium',
    color: '#225877',
    marginBottom: 12
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8
  },
  frequencyChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  frequencyChipSelected: {
    backgroundColor: '#E8F4F8',
    borderColor: '#5FA7D1'
  },
  frequencyChipText: {
    fontSize: 15,
    fontFamily: 'Prompt_400Regular',
    color: '#8E8E93'
  },
  frequencyChipTextSelected: {
    color: '#5FA7D1',
    fontFamily: 'Prompt_500Medium'
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
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#000'
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#5FA7D1',
    alignItems: 'center'
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Prompt_500Medium',
    color: '#fff'
  }
})
