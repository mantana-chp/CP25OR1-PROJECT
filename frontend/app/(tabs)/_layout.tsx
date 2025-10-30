import { Tabs } from 'expo-router'
import React from 'react'
<<<<<<< HEAD

import { HapticTab } from '@/components/haptic-tab'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
=======
import { StyleSheet, View } from 'react-native'

import { HapticTab } from '@/components/haptic-tab'
import { useColorScheme } from '@/src/hooks/use-color-scheme.web'
import { Calendar, PawPrintIcon } from 'lucide-react-native'

const CustomTabBarIcon = ({ icon: Icon, color, focused }: any) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Icon
        size={28}
        color={focused ? '#fff' : color}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  )
}
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc

export default function TabLayout() {
  const colorScheme = useColorScheme()

  return (
    <Tabs
      screenOptions={{
<<<<<<< HEAD
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab
=======
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#fff',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#5fa7d1',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 84,
          paddingBottom: 10,
          paddingTop: 10
        },
        tabBarLabelStyle: {
          fontSize: 0 // Hide labels
        },
        tabBarShowLabel: false
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
<<<<<<< HEAD
          // title: 'Calendar',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
=======
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon icon={Calendar} color={color} focused={focused} />
          )
        }}
      />
      {/* <Tabs.Screen
        name="pet_profile"
        options={{
          title: 'Pet Profile',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon
              icon={PawPrintIcon}
              color={color}
              focused={focused}
            />
          )
        }}
      /> */}
      <Tabs.Screen
        name="add_reminder"
        options={{
          title: 'Add Reminder',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon
              icon={PawPrintIcon}
              color={color}
              focused={focused}
            />
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc
          )
        }}
      />
    </Tabs>
  )
}
<<<<<<< HEAD
=======

const styles = StyleSheet.create({
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  }
})
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc
