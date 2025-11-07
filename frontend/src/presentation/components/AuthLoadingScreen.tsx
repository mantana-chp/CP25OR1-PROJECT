import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export default function AuthLoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#5FA7D1" />
      <Text style={styles.text}>กำลังโหลด...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#225877',
    fontFamily: 'Prompt_400Regular'
  }
})
