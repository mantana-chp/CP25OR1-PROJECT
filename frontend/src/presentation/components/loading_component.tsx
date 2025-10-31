import { Box, Spinner } from '@gluestack-ui/themed'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function loading_component() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </Box>
    </SafeAreaView>
  )
}
