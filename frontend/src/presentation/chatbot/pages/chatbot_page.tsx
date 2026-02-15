import _ from 'lodash'
import React, { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View
} from 'react-native'

import { usePets } from '@/src/context/PetContext'
import { IPetProfile } from '@/src/domain/pet.domain'
import { useError } from '@/src/presentation/components/error_context'
import { chatbotService } from '@/src/utils/api/services/chatbot_service'

import Header from '../../components/header_component'
import { DisclaimerModal } from '../components/ai_chatbot_disclaimer_modal'
import ChatBubble from '../components/chat_bubble'
import ChatInput from '../components/chat_input'
import { InfoButton } from '../components/info_button'
import PetDropdown from '../components/pet_dropdown'
import TryAgainHandler from '../components/try_again_handler'

interface Message {
  id: string
  text: string
  isUser: boolean
}

export default function ChatbotPage() {
  const { pets, loading, selectedPetId, setSelectedPetId, getSelectedPet } =
    usePets()
  const { showError } = useError()
  const [disclaimerVisible, setDisclaimerVisible] = useState(true)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const selectedPet = getSelectedPet()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isError, setIsError] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('')
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])

  // Show welcome message after disclaimer is accepted
  useEffect(() => {
    if (disclaimerAccepted && messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: 'สวัสดีค่ะ! 😊 ยินดีต้อนรับค่ะ ดิฉันพร้อมช่วยเหลือคำถามต่างๆ เกี่ยวกับเลี้ยงสัตว์เลี้ยงของคุณ ไม่ว่าจะเป็นเรื่องการดูแล อาหาร สุขภาพ หรือเรื่องอื่นๆ สามารถถามได้ตลอดเวลาค่ะ 🐾',
        isUser: false
      }
      setMessages([welcomeMessage])
    }
  }, [disclaimerAccepted])

  const handleDisclaimerClose = () => {
    setDisclaimerVisible(false)
    setDisclaimerAccepted(true)
  }

  const handleSelectPet = (pet: IPetProfile) => {
    setSelectedPetId(pet.id)
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
        leftChildren={<InfoButton onPress={() => setDisclaimerVisible(true)} />}
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
        keyboardVerticalOffset={0}
        behavior="padding"
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
        <ChatInput
          onSend={handleSendMessage}
          disabled={isTyping || !disclaimerAccepted}
        />
      </KeyboardAvoidingView>

      {/* Disclaimer Modal */}
      <DisclaimerModal
        visible={disclaimerVisible}
        onClose={handleDisclaimerClose}
      />
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
