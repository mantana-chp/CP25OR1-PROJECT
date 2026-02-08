import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import DatePicker from '../../components/date_picker'
import InputText from '../../components/text_input'

interface EndConditionSelectorProps {
  endType: 'never' | 'after' | 'on_date'
  endAfterOccurrences?: number
  endDate?: string
  onChange: (
    endType: 'never' | 'after' | 'on_date',
    endAfterOccurrences?: number,
    endDate?: string
  ) => void
}

export default function EndConditionSelector({
  endType,
  endAfterOccurrences,
  endDate,
  onChange
}: EndConditionSelectorProps) {
  const handleOccurrencesChange = (value: string) => {
    const occurrences = parseInt(value) || 1
    const validOccurrences = Math.max(1, Math.min(999, occurrences))
    onChange('after', validOccurrences, undefined)
  }

  const handleDateChange = (date: Date) => {
    onChange('on_date', undefined, date.toISOString().split('T')[0])
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.option, endType === 'never' && styles.optionSelected]}
        onPress={() => onChange('never', undefined, undefined)}
      >
        <View
          style={[styles.radio, endType === 'never' && styles.radioSelected]}
        >
          {endType === 'never' && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.optionText}>ไม่สิ้นสุด</Text>
      </Pressable>

      <Pressable
        style={[styles.option, endType === 'after' && styles.optionSelected]}
        onPress={() => onChange('after', endAfterOccurrences || 10, undefined)}
      >
        <View
          style={[styles.radio, endType === 'after' && styles.radioSelected]}
        >
          {endType === 'after' && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.optionText}>หลังจาก</Text>
        <View style={styles.occurrencesInput}>
          <InputText
            value={(endAfterOccurrences || 10).toString()}
            onChangeText={handleOccurrencesChange}
            keyboardType="numeric"
            placeholder="10"
            title=''
          />
        </View>
        <Text style={styles.optionText}>ครั้ง</Text>
      </Pressable>

      <View
        style={[styles.option, endType === 'on_date' && styles.optionSelected]}
      >
        <Pressable
          style={styles.radioRow}
          onPress={() =>
            onChange(
              'on_date',
              undefined,
              endDate || new Date().toISOString().split('T')[0]
            )
          }
        >
          <View
            style={[
              styles.radio,
              endType === 'on_date' && styles.radioSelected
            ]}
          >
            {endType === 'on_date' && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.optionText}>วันที่</Text>
        </Pressable>
        {endType === 'on_date' && (
          <View style={styles.datePickerContainer}>
            <DatePicker
              title=""
              value={endDate ? new Date(endDate) : new Date()}
              onChange={handleDateChange}
              placeholder="เลือกวันที่"
              small
              minimumDate={new Date()}
            />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    flexWrap: 'wrap'
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
    color: '#225877',
    marginRight: 8
  },
  occurrencesInput: {
    width: 60
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  datePickerContainer: {
    width: '100%',
    marginTop: 8
  }
})
