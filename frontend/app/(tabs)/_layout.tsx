import { Tabs } from 'expo-router'
import React from 'react'

import { HapticTab } from '@/components/haptic-tab'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Calendar, PawPrintIcon } from 'lucide-react-native'

export default function TabLayout() {
  const colorScheme = useColorScheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => (
            // <IconSymbol size={28} name="house.fill" color={color} />
            <Calendar size={28} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="pet_profile"
        options={{
          title: 'Pet Profile',
          tabBarIcon: ({ color }) => (
            // <IconSymbol size={28} name="paperplane.fill" color={color} />
            <PawPrintIcon size={28} color={color} />
          )
        }}
      />
    </Tabs>
  )
}
