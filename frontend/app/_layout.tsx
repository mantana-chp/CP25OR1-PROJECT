<<<<<<< HEAD
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
=======
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'

<<<<<<< HEAD
import { NotificationProvider } from '@/context/NotificationContext'
import { useColorScheme } from '@/hooks/use-color-scheme'

import * as Notifications from 'expo-notifications'
import '@/global.css'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import * as SplashScreen from 'expo-splash-screen'

import {
  useFonts,
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_700Bold
=======
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
  useFonts
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc
} from '@expo-google-fonts/prompt'

import { useCallback } from 'react'

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
  const colorScheme = useColorScheme()
  const [fontsLoaded] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_700Bold
  })

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
<<<<<<< HEAD
    <GluestackUIProvider mode="dark">
      <NotificationProvider>
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
=======
    <GluestackUIProvider mode="light">
      <NotificationProvider>
        <ThemeProvider value={DefaultTheme}>
>>>>>>> 38c038a3db8ec64c853c8e07c9de93637a272fdc
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </NotificationProvider>
    </GluestackUIProvider>
  )
}
