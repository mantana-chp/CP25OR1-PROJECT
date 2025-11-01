import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export default function LoadingComponent() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#5FA7D1" />
      <Text style={styles.loadingText}>กำลังโหลด...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff9f1',
    paddingVertical: 60
  },
  loadingText: {
    marginTop: 12,
    color: '#225877',
    fontSize: 16,
    fontFamily: 'Prompt_400Regular'
  }
})
