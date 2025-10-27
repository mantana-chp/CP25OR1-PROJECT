import React from 'react'
import { Button, ButtonText } from '@/components/ui/button'
import { ThemedView } from '@/components/themed-view'
import { Platform, StatusBar, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Test() {
  return (
    <ThemedView
      style={{
        flex: 1,
        padding: 10,
        paddingTop: Platform.OS == 'android' ? StatusBar.currentHeight : 10
      }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <Button className="bg-primary-500">
          <ButtonText className="text-secondary-100 font-prompt">
            Button
          </ButtonText>
        </Button>
        <Text className="text-xl font-bold text-blue-500 font-prompt justify-center flex">
          Welcome to Nativewind!
        </Text>
      </SafeAreaView>
    </ThemedView>
  )
}
