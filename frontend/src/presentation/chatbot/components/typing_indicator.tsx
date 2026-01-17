import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

export default function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true
          })
        ])
      )
    }

    const animation1 = animateDot(dot1, 0)
    const animation2 = animateDot(dot2, 150)
    const animation3 = animateDot(dot3, 300)

    animation1.start()
    animation2.start()
    animation3.start()

    return () => {
      animation1.stop()
      animation2.stop()
      animation3.stop()
    }
  }, [])

  const getDotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1]
    }),
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8]
        })
      },
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2]
        })
      }
    ]
  })

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8
  },
  bubble: {
    backgroundColor: '#D7E9F4',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 20
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5FA7D1'
  }
})
