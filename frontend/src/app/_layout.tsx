import { SplashScreen, Stack } from 'expo-router'
import 'react-native-reanimated'

import '@/global.css'
import * as Notifications from 'expo-notifications'

import { NotificationProvider } from '@/context/NotificationContext'
import {
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_700Bold,
  useFonts
} from '@expo-google-fonts/prompt'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Platform } from 'react-native'
import { AuthProvider } from '../context/AuthContext'

const isWeb = Platform.OS === 'web'

if (!isWeb) {
  SplashScreen.preventAutoHideAsync()
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
})

export default function RootLayout() {
  console.log('📱 [RootLayout] Component rendering...')

  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_700Bold
  })

  if (!fontsLoaded) return null
  console.log('🔤 [RootLayout] Fonts loaded: true')

  // const { isLoading, isAuthenticated, error } = useAuth()

  // if (isLoading) {
  //   return <LoadingComponent />
  // }

  // if (error || !isAuthenticated) {
  //   return (
  //     <View>
  //       <Text>Error: {error}</Text>
  //     </View>
  //   )
  // }
  return (
    <React.Fragment>
      <NotificationProvider>
        <StatusBar style="auto" />
        <AuthProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-reminder"
              options={{ presentation: 'modal' }}
            />
          </Stack>
        </AuthProvider>
      </NotificationProvider>
    </React.Fragment>
  )
}
