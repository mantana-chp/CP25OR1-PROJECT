import React from 'react'

import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface HeaderProps {
  title: string
  goBack?: boolean
  onBackPress?: () => void
  leftChildren?: React.ReactNode
  rightChildren?: React.ReactNode
}

export default function Header(props: HeaderProps) {
  // ------------------
  // CONST
  // ------------------
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const handleBackPress = () => {
    if (props.onBackPress) {
      props.onBackPress()
    } else {
      router.back()
    }
  }

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
      {/* Left Section */}
      <View style={styles.leftSection}>
        {props.goBack ? (
          <Pressable onPress={handleBackPress}>
            <Text style={styles.headerBackIcon}>
              <ChevronLeft color="white" />
            </Text>
          </Pressable>
        ) : props.leftChildren ? (
          props.leftChildren
        ) : null}
      </View>

      {/* Center Title - Absolutely positioned */}
      <View style={styles.centerSection}>
        <Text style={styles.headerTitle}>{props.title}</Text>
      </View>

      {/* Right Section */}
      <View style={styles.rightSection}>
        {props.rightChildren ? props.rightChildren : null}
      </View>
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
    position: 'relative'
  },
  leftSection: {
    zIndex: 2
  },
  centerSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  rightSection: {
    marginLeft: 'auto',
    zIndex: 2
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
