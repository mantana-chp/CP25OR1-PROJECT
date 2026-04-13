import { HapticTab } from '@/components/haptic-tab'
import { useUnreadNotifications } from '@/src/context/UnreadNotificationContext'
import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Bell, BotMessageSquare } from 'lucide-react-native'
import React from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const CustomTabBarIcon = ({ icon: Icon, color, focused, badge }: any) => {
  return (
    <View style={styles.iconContainer}>
      <Icon
        size={28}
        color={focused ? '#fff' : color}
        strokeWidth={focused ? 2.5 : 2}
        fill={focused ? '#fff' : 'none'}
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
  const { unreadCount } = useUnreadNotifications()
  const insets = useSafeAreaInsets()

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
          height: Platform.OS === 'android' ? 56 + insets.bottom : 84,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'android' ? insets.bottom : 12,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          // Hide labels
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Reminder',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={28}
                color={focused ? '#fff' : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name='in_app_notification'
        options={{
          title: 'In App Notification',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon
              icon={Bell}
              color={color}
              focused={focused}
              badge={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='chatbot'
        options={{
          title: 'Chatbot',
          tabBarIcon: ({ color, focused }) => (
            <CustomTabBarIcon
              icon={BotMessageSquare}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='pet_profile'
        options={{
          title: 'Pet Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? 'paw' : 'paw-outline'}
                size={28}
                color={focused ? '#fff' : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name='reminder-details/[id]'
        options={{
          title: 'รายละเอียด',
          href: null,
        }}
      />

      {/* === หน้าที่ซ่อนจาก Tab Bar === */}
      <Tabs.Screen
        name='add_reminder'
        options={{
          title: 'เพิ่มแจ้งเตือน',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name='add_pet_form'
        options={{
          title: 'สร้างโปรไฟล์สัตว์เลี้ยง',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name='health_record'
        options={{
          title: 'ประวัติสุขภาพ',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name='medical_documents'
        options={{
          title: 'เอกสารสุขภาพ',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name='access_list'
        options={{
          title: 'จัดการผู้ดูแล',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name='pet_sharing'
        options={{
          title: 'เชิญดูแลร่วม',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name='scan_pet_share'
        options={{
          title: 'รับสิทธิ์ดูแลร่วม',
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name='scan_pet_transfer'
        options={{
          title: 'รับโอนสิทธิ์เจ้าของ',
          href: null,
          tabBarStyle: { display: 'none' },
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
    position: 'relative',
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
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
})
