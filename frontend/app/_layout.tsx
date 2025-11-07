import { Stack } from 'expo-router'
import 'react-native-reanimated'

import '@/global.css'
import * as Notifications from 'expo-notifications'

import {
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_700Bold,
  useFonts
} from '@expo-google-fonts/prompt'

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { NotificationProvider } from '@/context/NotificationContext'
import { AuthProvider, useAuth } from '@/src/context/AuthContext'
import AuthLoadingScreen from '@/src/presentation/components/AuthLoadingScreen'
import { ErrorProvider } from '@/src/presentation/components/error_context'
import { Text, View } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
})

export const unstable_settings = {
  anchor: '(tabs)'
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_700Bold
  })

  if (!fontsLoaded) return null

  return (
    <AuthProvider>
      <GluestackUIProvider mode="light">
        <ErrorProvider>
          <NotificationProvider>
            <RootLayoutNav />
          </NotificationProvider>
        </ErrorProvider>
      </GluestackUIProvider>
    </AuthProvider>
  )
}

// This is INSIDE AuthProvider, so useAuth() works
function RootLayoutNav() {
  const { isLoading, isAuthenticated, error } = useAuth()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (error || !isAuthenticated) {
    return (
      <View>
        <Text>Error: {error}</Text>
      </View>
    )
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-reminder" options={{ presentation: 'modal' }} />
    </Stack>
  )
}