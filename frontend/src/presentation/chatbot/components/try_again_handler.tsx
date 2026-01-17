import { RefreshCw, Siren } from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface TryAgainHandlerProps {
  onRetry: () => void
  message?: string
}

export default function TryAgainHandler({
  onRetry,
  message = 'มีข้อผิดพลาดเกิดขึ้น โปรดลองใหม่อีกครั้ง'
}: TryAgainHandlerProps) {
  return (
    <View style={styles.container}>
      <Siren color="#C62828" size={24} />

      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={16} color="#C62828" strokeWidth={2.5} />
        <Text style={styles.retryText}>ลองอีกครั้ง</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBDBE1',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BF1737',
    gap: 12
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Prompt_400Regular',
    color: '#BF1737',
    lineHeight: 20
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  retryText: {
    fontSize: 14,
    fontFamily: 'Prompt_500Medium',
    color: '#BF1737'
  }
})
