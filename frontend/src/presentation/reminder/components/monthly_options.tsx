import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import InputText from '../../components/text_input'

interface MonthlyOptionsProps {
  monthlyType: 'day_of_month' | 'last_day'
  dayOfMonth: number
  onChange: (type: 'day_of_month' | 'last_day', dayOfMonth?: number) => void
}

export default function MonthlyOptions({
  monthlyType,
  dayOfMonth,
  onChange
}: MonthlyOptionsProps) {
  const handleDayChange = (value: string) => {
    const day = parseInt(value) || 1
    const validDay = Math.max(1, Math.min(31, day))
    onChange('day_of_month', validDay)
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.option,
          monthlyType === 'day_of_month' && styles.optionSelected
        ]}
        onPress={() => onChange('day_of_month', dayOfMonth)}
      >
        <View
          style={[
            styles.radio,
            monthlyType === 'day_of_month' && styles.radioSelected
          ]}
        >
          {monthlyType === 'day_of_month' && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.optionText}>วันที่</Text>
        <View style={styles.dayInput}>
          <InputText
            value={dayOfMonth.toString()}
            onChangeText={handleDayChange}
            keyboardType="numeric"
            placeholder="1"
            title=''
          />
        </View>
        <Text style={styles.optionText}>ของเดือน</Text>
      </Pressable>

      <Pressable
        style={[
          styles.option,
          monthlyType === 'last_day' && styles.optionSelected
        ]}
        onPress={() => onChange('last_day')}
      >
        <View
          style={[
            styles.radio,
            monthlyType === 'last_day' && styles.radioSelected
          ]}
        >
          {monthlyType === 'last_day' && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.optionText}>วันสุดท้ายของเดือน</Text>
      </Pressable>
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
    color: '#225877',
    marginRight: 8
  },
  dayInput: {
    width: 60
  }
})
