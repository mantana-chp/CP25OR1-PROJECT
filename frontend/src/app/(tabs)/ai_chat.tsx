import React from 'react'
import { View, Text } from 'react-native'
import { ChatMain } from '@/src/presentation/ai_chatbot/ai_chatbot_main'

export default function AIChatScreen() {
  // const handleSendMessage = (message: string) => {
  //   console.log('Sending message to AI API:', message)
  // }

  const HeaderComponent = () => (
    <Text className='text-lg font-semibold text-gray-800'>Udon</Text>
  )

  // const InputComponent = () => (
  //   <View className='px-4 py-3'>
  //     <Text className='text-sm text-gray-500'>
  //       [Input component placeholder]
  //     </Text>
  //   </View>
  // )

  return (
    <ChatMain
      headerComponent={<HeaderComponent />}
      // inputComponent={<InputComponent />}
      // onSendMessage={handleSendMessage}
    />
  )
}
