import { AlertCircle } from 'lucide-react-native'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function OverdueAlert() {
  return (
    <View style={styles.overdueAlert}>
      <AlertCircle color="#DC2626" size={20} />
      <View style={styles.overdueAlertTextContainer}>
        <Text style={styles.overdueAlertTitle}>อ๊ะ! เลยเวลาแล้ว</Text>
        <Text style={styles.overdueAlertMessage}>
          ดูเหมือนว่ารายการนี้จะเลยกำหนดแล้วนะ
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overdueAlert: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    alignItems: 'center'
  },
  overdueAlertTextContainer: {
    flex: 1,
    gap: 2
  },
  overdueAlertTitle: {
    color: '#DC2626',
    fontSize: 14,
    fontFamily: 'Prompt_700Bold'
  },
  overdueAlertMessage: {
    color: '#991B1B',
    fontSize: 12,
    fontFamily: 'Prompt_400Regular',
    lineHeight: 16
  }
})
