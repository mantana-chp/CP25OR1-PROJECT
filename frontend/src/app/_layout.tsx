import { SplashScreen, Stack } from 'expo-router'
import 'react-native-reanimated'

import '@/global.css'
import * as Notifications from 'expo-notifications'

import { NotificationProvider } from '@/context/NotificationContext'
import { useAuthStore } from '@/src/utils/authStore'
import {
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_700Bold,
  useFonts
} from '@expo-google-fonts/prompt'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { Platform } from 'react-native'

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

// export const unstable_settings = {
//   anchor: '(tabs)'
// }

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_700Bold
  })
  const {
    isLoggedIn,
    shouldCreateAccount,
    hasCompletedOnboarding,
    _hasHydrated
  } = useAuthStore()

  // https://zustand.docs.pmnd.rs/integrations/persisting-store-data#how-can-i-check-if-my-store-has-been-hydrated
  // Hide the splash screen after the store has been hydrated
  useEffect(() => {
    if (_hasHydrated) {
      SplashScreen.hideAsync()
    }
  }, [_hasHydrated])

  if (!_hasHydrated && !isWeb) {
    return null
  }

  if (!fontsLoaded) return null

  // const { isLoading, isAuthenticated, error } = useAuth()

  // if (isLoading) {
  //   return <AuthLoadingScreen />
  // }

  // if (error || !isAuthenticated) {
  //   return (
  //     <View>
  //       <Text>Error: {error}</Text>
  //     </View>
  //   )
  // }
  return (
    // <AuthProvider>
    <React.Fragment>
      <NotificationProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-reminder"
            options={{ presentation: 'modal' }}
          />
        </Stack>
      </NotificationProvider>
    </React.Fragment>
    // </AuthProvider>
  )
}
