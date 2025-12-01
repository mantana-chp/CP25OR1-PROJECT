import { Tabs } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { HapticTab } from '@/components/haptic-tab'
import { useUnreadNotifications } from '@/src/context/UnreadNotificationContext'
import { useColorScheme } from '@/src/hooks/use-color-scheme.web'
import { Bell, Calendar, PawPrintIcon } from 'lucide-react-native'

const CustomTabBarIcon = ({ icon: Icon, color, focused, badge }: any) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Icon
        size={28}
        color={focused ? '#fff' : color}
        strokeWidth={focused ? 2.5 : 2}
      />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  )
}

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const { unreadCount } = useUnreadNotifications()

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
        name="in_app_notification"
        options={{
          title: 'In App Notification',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon
              icon={Bell}
              color={color}
              focused={focused}
              badge={unreadCount}
            />
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
    backgroundColor: 'transparent',
    position: 'relative'
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 6
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center'
  }
})
