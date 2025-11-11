import { SplashScreen, Stack } from 'expo-router'
import React, { useEffect } from 'react'

import * as Notifications from 'expo-notifications'

import { NotificationProvider } from '@/context/NotificationContext'
import { AuthProvider } from '../context/AuthContext'
import { TokenRefreshProvider } from '../context/TokenRefreshContext'

import {
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_700Bold,
  useFonts
} from '@expo-google-fonts/prompt'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'

import LoadingComponent from '../presentation/components/loading_component'

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

  const [fontsLoaded, fontError] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_700Bold
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (!isWeb) {
        SplashScreen.hideAsync()
      }
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return <LoadingComponent />
  }

  return (
    <React.Fragment>
      <TokenRefreshProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="home" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="onboarding"
                options={{ headerShown: false }}
              />
            </Stack>
          </NotificationProvider>
        </AuthProvider>
      </TokenRefreshProvider>
    </React.Fragment>
  )
}
