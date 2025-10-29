import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function ReminderList() {
  return (
    <View style={styles.reminderContainer}>
      <Text style={styles.inactiveText}>นัดหมาย</Text>
      <Text style={styles.inactiveText}>เสร็จสิ้น</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  reminderContainer: {
    borderRadius: 16,
    alignItems: 'flex-start',
    backgroundColor: '#fff9f1',
    marginTop: 24,
    flexDirection: 'row',
    gap: 24,
    paddingLeft: 16,
    width: '100%',
    height: '100%'
  },
  inactiveText: {
    color: '#A6A6A6',
    fontSize: 17,
    fontFamily: 'Prompt_400Regular',
    paddingTop: 12
    
  },
  activeText: {
    color: '#225877',
    fontWeight: '600',
    textDecorationLine: 'underline'
  }
})
