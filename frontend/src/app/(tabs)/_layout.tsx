import { Tabs } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { HapticTab } from '@/components/haptic-tab'
import { useColorScheme } from '@/src/hooks/use-color-scheme.web'
import { Calendar, FlaskConical, PawPrintIcon } from 'lucide-react-native'

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

export default function TabLayout() {
  const colorScheme = useColorScheme()

  return (
    <Tabs
      screenOptions={{
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
          paddingTop: 12,
          justifyContent: 'center',
          alignItems: 'center'
        },
        tabBarLabelStyle: {
          fontSize: 0 // Hide labels
        },
        tabBarShowLabel: false
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Reminder',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon icon={Calendar} color={color} focused={focused} />
          )
        }}
      />
      <Tabs.Screen
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
      />
      <Tabs.Screen
        name="test-auth"
        options={{
          title: 'Test Auth',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon
              icon={FlaskConical}
              color={color}
              focused={focused}
            />
          )
        }}
      />
      {/* === หน้าที่ซ่อนจาก Tab Bar === */}
      <Tabs.Screen
        name="add-reminder"
        options={{
          title: 'เพิ่มแจ้งเตือน',
          href: null
        }}
      />
      <Tabs.Screen
        name="reminder-details/[id]"
        options={{
          title: 'รายละเอียด',
          href: null
        }}
      />
      <Tabs.Screen
        name="add_pet_form"
        options={{
          title: 'สร้างโปรไฟล์สัตว์เลี้ยง',
          href: null
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    backgroundColor: 'transparent'
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  }
})
