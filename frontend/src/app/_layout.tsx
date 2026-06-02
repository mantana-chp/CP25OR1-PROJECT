import { SplashScreen, Stack } from 'expo-router'
import React, { useEffect } from 'react'

import * as Notifications from 'expo-notifications'

import { NotificationProvider } from '@/src/context/NotificationContext'
import { PetProvider } from '@/src/context/PetContext'
import { UnreadNotificationProvider } from '@/src/context/UnreadNotificationContext'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { TokenRefreshProvider } from '../context/TokenRefreshContext'
import { ErrorProvider } from '../presentation/components/error_context'
import PushNotificationInitializer from '../presentation/components/push_notification_initializer'
import RealtimeReminderNotification from '../presentation/notification/components/realtime_reminder_notification'

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
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
})

function AppRuntimeEffects() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth()

  if (isLoading || !isAuthenticated || !hasCompletedOnboarding) {
    return null
  }

  return (
    <>
      <PushNotificationInitializer />
      <RealtimeReminderNotification />
    </>
  )
}

function AppStackNavigator() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth()

  const isRoutingReady = !isLoading

  if (!isRoutingReady) {
    return <LoadingComponent />
  }

  const canAccessTabs = isAuthenticated && hasCompletedOnboarding
  const canAccessOnboarding = !isAuthenticated || !hasCompletedOnboarding

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Protected guard={canAccessOnboarding}>
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={canAccessTabs}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {

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
          <ErrorProvider>
            <NotificationProvider>
              <UnreadNotificationProvider>
                <PetProvider>
                  <AppRuntimeEffects />
                  <StatusBar style="auto" />
                  <AppStackNavigator />
                </PetProvider>
              </UnreadNotificationProvider>
            </NotificationProvider>
          </ErrorProvider>
        </AuthProvider>
      </TokenRefreshProvider>
    </React.Fragment>
  )
}
