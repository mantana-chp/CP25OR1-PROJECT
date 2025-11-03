import React from 'react'

import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

interface HeaderProps {
  title: string
  goBack?: boolean
}

export default function Header(props: HeaderProps) {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()

  // ------------------
  // RENDER
  // ------------------
  return (
    <View style={styles.header}>
      {props.goBack && (
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBackIcon}>‹</Text>
        </Pressable>
      )}
      <Text style={[styles.headerTitle, !props.goBack && { flex: 1, textAlign: 'center' }]}>
        {props.title}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: '#5FA7D1',
    padding: 16,
    alignItems: 'center',
    gap: 16
  },
  headerBackIcon: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Prompt_700Bold'
  }
})
