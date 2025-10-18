import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text
} from 'react-native'

const { width } = Dimensions.get('window')

export default function InAppNotification({ message, onHide }: { message: string; onHide: () => void }) {
  const position = useRef(new Animated.Value(-100)).current

  useEffect(() => {
    // Animate the notification sliding down from the top
    Animated.timing(position, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start()

    // Set a timer to hide the notification after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(position, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }).start(() => onHide())
    }, 3000)

    return () => clearTimeout(timer)
  }, [message])

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: position }] }]}
    >
      <SafeAreaView>
        <Text style={styles.message}>{message}</Text>
      </SafeAreaView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    width: width,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center'
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center'
  }
})
