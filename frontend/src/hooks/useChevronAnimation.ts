import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

export const useChevronAnimation = (isExpanded: boolean) => {
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start()
  }, [isExpanded, rotateAnim])

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg']
  })

  return chevronRotation
}
