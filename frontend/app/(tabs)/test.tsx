import React from 'react'
import { Button, ButtonText } from '@/components/ui/button'
import { ThemedView } from '@/components/themed-view'
import { Platform, StatusBar } from 'react-native'
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
        <Button action="primary" variant="solid" size="lg" isDisabled>
          <ButtonText>Button</ButtonText>
        </Button>
      </SafeAreaView>
    </ThemedView>
  )
}
