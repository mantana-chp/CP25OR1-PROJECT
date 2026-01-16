import _ from 'lodash'
import React, { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from 'react-native'

import { usePets } from '@/src/context/PetContext'
import { IPetProfile } from '@/src/domain/pet.domain'
import { useError } from '@/src/presentation/components/error_context'
import { chatbotService } from '@/src/utils/api/services/chatbot_service'

import Header from '../../components/header_component'
import ChatBubble from '../components/chat_bubble'
import ChatInput from '../components/chat_input'
import PetDropdown from '../components/pet_dropdown'
import TryAgainHandler from '../components/try_again_handler'

interface Message {
  id: string
  text: string
  isUser: boolean
}

export default function ChatbotPage() {
  const { pets, loading } = usePets()
  const { showError } = useError()
  const [selectedPet, setSelectedPet] = useState<IPetProfile | null>(
    pets.length > 0 ? pets[0] : null
  )
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'สวัสดีครับ! ผมพร้อมที่จะช่วยตอบคำถามเกี่ยวกับสัตว์เลี้ยงของคุณครับ',
      isUser: false
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [isError, setIsError] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('')
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (pets.length > 0 && !selectedPet) {
      setSelectedPet(pets[0])
    }
  }, [pets])

  const handleSelectPet = (pet: IPetProfile) => {
    setSelectedPet(pet)
  }

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)
    setIsError(false)

    // Scroll to bottom after user message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    try {
      // Call the API with query and optional petId
      const response = await chatbotService.sendMessage(text, selectedPet?.id)

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        isUser: false
      }
      setMessages((prev) => [...prev, aiMessage])

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error('Chat error:', error)
      setLastFailedMessage(text)
      setIsError(true)
      showError(
        error.message || 'เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง'
      )
    } finally {
      setIsTyping(false)
    }
  }
  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage)
    }
  }

  return (
    <View style={styles.container}>
      <Header
        title="แชทบอท"
        rightChildren={
          <PetDropdown
            pets={pets}
            selectedPet={selectedPet}
            onSelectPet={handleSelectPet}
          />
        }
      />

      <KeyboardAvoidingView
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {_.map(messages, (message) => (
            <ChatBubble
              key={message.id}
              message={message.text}
              isUser={message.isUser}
            />
          ))}

          {isTyping && <ChatBubble message="" isUser={false} isTyping={true} />}
        </ScrollView>

        {isError && (
          <TryAgainHandler
            onRetry={handleRetry}
            message="เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง"
          />
        )}

        {/* Chat Input */}
        <ChatInput onSend={handleSendMessage} disabled={isTyping} />
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  chatContainer: {
    flex: 1
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFF9F1'
  },
  messagesContent: {
    paddingVertical: 16,
    flexGrow: 1
  }
})
