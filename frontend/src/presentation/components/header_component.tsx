import React from 'react'

import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface HeaderProps {
  title: string
  goBack?: boolean
}

export default function Header(props: HeaderProps) {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // ------------------
  // RENDER
  // ------------------
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top > 0 ? insets.top : 24,
          height: (insets.top > 0 ? insets.top : 24) + 50
        }
      ]}
    >
      {props.goBack && (
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBackIcon}>
            <ChevronLeft color="white" />
          </Text>
        </Pressable>
      )}
      <Text
        style={[
          styles.headerTitle,
          !props.goBack && { flex: 1, textAlign: 'center' }
        ]}
      >
        {props.title}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: '#5FA7D1',
    paddingHorizontal: 24,
    paddingBottom: 24,
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
