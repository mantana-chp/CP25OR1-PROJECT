import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { NotificationProvider } from '@/context/NotificationContext'
import { useColorScheme } from '@/src/hooks/use-color-scheme'

import '@/global.css'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'

import {
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_700Bold,
  useFonts,
} from '@expo-google-fonts/prompt'

import { useCallback } from 'react'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_700Bold,
  })

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GluestackUIProvider mode='light'>
      <NotificationProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
            <Stack.Screen
              name='modal'
              options={{ presentation: 'modal', title: 'Modal' }}
            />
            <Stack.Screen
              name='add_reminder'
              options={{ headerShown: false }}
            />
          </Stack>
          <StatusBar style='auto' />
        </ThemeProvider>
      </NotificationProvider>
    </GluestackUIProvider>
  )
}
